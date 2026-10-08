"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Bell, Calendar, ChevronRight, Circle, Clock3, Eye, FileText, MessageSquare, Sparkles, Users, Video, X } from "lucide-react"
import { DashboardContentProps } from "@/@types/props"
import { deleteJobOffer, updateJobStatus } from "@/actions/offers"
import { getRecommendations } from "@/actions/dashboard"
import { extractApiErrorMessage } from "@/lib/api-error"
import { UpcomingInterviewsCard } from "@/components/upcoming-interviews-card"

// `recharts` est lourd et uniquement nécessaire une fois affiché à l'écran :
// chargé en dynamique (sans SSR) pour sortir ce poids du First Load JS de /dashboard.
const DashboardCharts = dynamic(() => import("@/components/dashboard/dashboard-charts"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card><CardContent className="h-72 animate-pulse p-5" /></Card>
      <Card><CardContent className="h-72 animate-pulse p-5" /></Card>
    </div>
  ),
})

const FALLBACK_BARS = [
  { month: "Jan", value: 60 },
  { month: "Fev", value: 78 },
  { month: "Mar", value: 90 },
  { month: "Avr", value: 82 },
  { month: "Mai", value: 95 },
  { month: "Jun", value: 135 },
]

const FALLBACK_LINES = [
  { month: "Jan", value: 280 },
  { month: "Fev", value: 330 },
  { month: "Mar", value: 410 },
  { month: "Avr", value: 450 },
  { month: "Mai", value: 490 },
  { month: "Jun", value: 580 },
]

const KPI_ICONS = [FileText, MessageSquare, Eye, Video]
const KPI_TITLES = ["Annonces actives", "Candidatures recues", "Vues cette semaine", "Entretiens planifies"]

const CANDIDATE_STATUS: Record<string, { tag: string; tagClass: string }> = {
  EN_ATTENTE: { tag: "En attente", tagClass: "bg-amber-100 text-amber-600" },
  APPROUVEE: { tag: "Accepté", tagClass: "bg-green-100 text-green-600" },
  REJETEE: { tag: "Refusé", tagClass: "bg-red-100 text-red-500" },
  EN_COURS: { tag: "Entretien programmé", tagClass: "bg-blue-100 text-blue-600" },
}

const OFFER_STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Active", cls: "bg-green-100 text-green-600" },
  CLOSED: { label: "Expiré", cls: "bg-red-100 text-red-500" },
  DRAFT: { label: "Brouillon", cls: "bg-amber-100 text-amber-600" },
}

type OfferAction =
  | { kind: "link"; label: string; href: string }
  | { kind: "status"; label: string; status: "ACTIVE" | "CLOSED" }
  | { kind: "delete"; label: string }

/**
 * Chaque bouton d'une offre récente mène à une action qui existe réellement
 * côté backend. Un brouillon ne se publie pas d'un clic - il lui manque en
 * général des champs exigés à la publication - il repasse donc par le
 * formulaire, comme sur /annonces.
 */
function offerActions(id: string, status: string): OfferAction[] {
  if (status === "DRAFT") {
    return [
      { kind: "link", label: "Reprendre", href: `/poster-offre?id=${id}` },
      { kind: "delete", label: "Supprimer" },
    ]
  }

  if (status === "CLOSED") {
    return [
      { kind: "link", label: "Candidatures", href: "/candidatures" },
      { kind: "status", label: "Réactiver", status: "ACTIVE" },
      { kind: "delete", label: "Supprimer" },
    ]
  }

  return [
    { kind: "link", label: "Candidatures", href: "/candidatures" },
    { kind: "link", label: "Modifier", href: `/poster-offre?id=${id}` },
    { kind: "status", label: "Marquer expirée", status: "CLOSED" },
    { kind: "delete", label: "Supprimer" },
  ]
}

export default function Content(props: DashboardContentProps) {
  const kpis = KPI_TITLES.map((title, i) => ({
    title,
    value: props.statsData?.[i]?.value ?? "-",
    Icon: KPI_ICONS[i],
  }))

  const bars = props.chartData?.length > 0
    ? props.chartData.map(d => ({ month: d.month, value: d.value }))
    : FALLBACK_BARS

  const lines = props.lineChartData?.length > 0
    ? props.lineChartData.map(d => ({ month: d.month, value: d.value }))
    : FALLBACK_LINES

  const candidates = props.recentCandidates?.length > 0
    ? props.recentCandidates.map(c => ({
        name: c.candidateName,
        role: c.candidateEmail,
        when: new Date(c.appliedDate).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        score: c.score,
        tag: CANDIDATE_STATUS[c.status]?.tag ?? c.status,
        tagClass: CANDIDATE_STATUS[c.status]?.tagClass ?? "bg-gray-100 text-gray-600",
      }))
    : [
        { name: "-", role: "-", when: "-", score: 0, tag: "En attente", tagClass: "bg-amber-100 text-amber-600" },
      ]

  const bestOffers = props.topOffers?.length > 0
    ? props.topOffers.map(o => ({ title: o.title, company: o.company?.name ?? "-" }))
    : []

  // Les offres récentes sont éditables depuis le tableau de bord : leur statut
  // vit donc dans un état local plutôt que dans les props du serveur.
  const [offers, setOffers] = useState(props.recentOffers ?? [])
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [dismissedTips, setDismissedTips] = useState(false)
  const [recommendations, setRecommendations] = useState<string[] | null>(null)

  useEffect(() => {
    getRecommendations()
      .then((res) => setRecommendations(res.items))
      .catch((err) => console.error("[dashboard] recommendations error:", err))
  }, [])

  const recents = offers.map(o => {
    const s = OFFER_STATUS[o.status] ?? { label: o.status, cls: "bg-gray-100 text-gray-600" }
    return {
      id: o.id,
      title: o.title,
      status: s.label,
      statusClass: s.cls,
      // Un brouillon n'a pas forcément de localisation, de type ni de date :
      // on n'assemble que les fragments réellement renseignés.
      meta: [
        o.location,
        o.type,
        o.publishDate ? `Publié le ${new Date(o.publishDate).toLocaleDateString("fr-FR")}` : null,
      ]
        .filter(Boolean)
        .join(" • "),
      apps: o.applicants > 0 ? `${o.applicants} candidatures` : "",
      actions: offerActions(o.id, o.status),
    }
  })

  const handleStatus = async (id: string, status: "ACTIVE" | "CLOSED") => {
    setBusyId(id)
    try {
      await updateJobStatus(id, status)
      setOffers((prev) => prev.map((o) => o.id === id ? { ...o, status } : o))
      toast.success(status === "ACTIVE" ? "Offre réactivée." : "Offre marquée comme expirée.")
    } catch (err) {
      console.error("[dashboard] offer status error:", err)
      toast.error(extractApiErrorMessage(err, "Le changement de statut a échoué."))
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setBusyId(confirmDelete.id)
    try {
      await deleteJobOffer(confirmDelete.id)
      setOffers((prev) => prev.filter((o) => o.id !== confirmDelete.id))
      setConfirmDelete(null)
      toast.success("Offre supprimée.")
    } catch (err) {
      console.error("[dashboard] offer delete error:", err)
      toast.error(extractApiErrorMessage(err, "La suppression de l'offre a échoué."))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de votre activité de recrutement : offres en ligne, candidatures reçues et actions à traiter."
      />

      {/* 7/12 pour les indicateurs, 5/12 pour les entretiens : la carte de
          planification a besoin de la place d'une liste, pas d'une colonne. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
          {kpis.map((kpi) => (
            <Card key={kpi.title}><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{kpi.title}</p><p className="mt-1 text-4xl font-bold">{kpi.value}</p></div><kpi.Icon className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
          ))}
        </div>

        <div className="lg:col-span-5">
          <UpcomingInterviewsCard />
        </div>
      </div>

      <DashboardCharts bars={bars} lines={lines} />

      {/* N'apparaît qu'une fois les recommandations chargées : pas de place
          pour un texte générique pendant que les vraies stats se calculent. */}
      {!dismissedTips && recommendations && recommendations.length > 0 && (
        <Card className="overflow-hidden border-0 bg-brand-gradient text-white">
          <CardContent className="relative p-5">
            <button
              onClick={() => setDismissedTips(true)}
              aria-label="Masquer les recommandations"
              className="absolute right-2 top-2 rounded p-1 text-blue-100 transition-colors hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4" /><p className="text-lg sm:text-xl font-semibold">Recommandations IA du jour</p></div>
            <div className="space-y-1 text-xs sm:text-sm text-blue-100">
              {recommendations.map((item, i) => <p key={i}>• {item}</p>)}
            </div>
            <div className="pointer-events-none absolute -bottom-8 right-2 h-24 w-24 rounded-full border-[18px] border-blue-300/40" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Candidatures recentes (Goriya Score)</CardTitle>
            <Link href="/candidatures" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline">
              Voir tout <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {candidates.map((c, i) => (
              <div key={`${c.name}-${i}`} className="rounded-md bg-muted/30 p-3"><div className="mb-0.5 flex items-center justify-between gap-2"><p className="text-sm font-medium">{c.name}</p><p className="inline-flex items-center gap-1 text-sm font-semibold"><Circle className="h-2 w-2 fill-amber-400 text-amber-400" /> {c.score}/100</p></div><p className="text-xs text-muted-foreground">{c.role}</p><div className="mt-1 flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{c.when}</p><span className={`rounded-full px-2 py-0.5 text-[10px] ${c.tagClass}`}>{c.tag}</span></div></div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Offres les plus performantes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {bestOffers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune offre disponible.</p>
            ) : bestOffers.map((o, i) => (
              <div key={`${o.title}-${i}`}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{o.title}</p>
                  <span className="text-xs text-muted-foreground">{o.company}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground">Offres récentes</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Aperçu de vos dernières publications</p>
        {recents.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune offre récente.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {recents.map((o) => (
              <Card key={o.id}>
                <CardContent className="p-4">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{o.title}</p>
                    <Badge className={`text-[10px] ${o.statusClass}`}>{o.status}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{o.meta}</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">{o.apps}</p>
                    <div className="flex flex-wrap gap-1">
                      {o.actions.map((action) => action.kind === "link" ? (
                        <Button key={action.label} variant="outline" size="sm" className="h-6 px-2 text-[10px]" asChild>
                          <Link href={action.href}>{action.label}</Link>
                        </Button>
                      ) : action.kind === "status" ? (
                        <Button
                          key={action.label}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          disabled={busyId === o.id}
                          onClick={() => handleStatus(o.id, action.status)}
                        >
                          {action.label}
                        </Button>
                      ) : (
                        <Button
                          key={action.label}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-red-500 hover:bg-red-50 hover:text-red-600"
                          disabled={busyId === o.id}
                          onClick={() => setConfirmDelete({ id: o.id, title: o.title })}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {confirmDelete?.title} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;offre et les candidatures qui y sont rattachées ne seront plus accessibles.
              Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId === confirmDelete?.id}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete() }}
              disabled={busyId === confirmDelete?.id}
              className="bg-red-500 hover:bg-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="hidden"><Clock3 /><Users /><Bell /><Calendar /></div>
    </div>
  )
}
