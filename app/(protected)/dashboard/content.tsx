"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Calendar, Camera, ChevronRight, Circle, Clock3, Eye, FileText, MessageSquare, Sparkles, Users, Video, X } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { DashboardContentProps } from "@/@types/props"

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

function offerButtons(status: string): string[] {
  if (status === "ACTIVE") return ["Modifier", "Promouvoir", "Marquer expirée", "Effacer"]
  if (status === "DRAFT") return ["Modifier", "Publier", "Effacer"]
  return ["Rapport final", "Effacer"]
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

  const recents = props.recentOffers?.length > 0
    ? props.recentOffers.map(o => {
        const s = OFFER_STATUS[o.status] ?? { label: o.status, cls: "bg-gray-100 text-gray-600" }
        return {
          title: o.title,
          status: s.label,
          statusClass: s.cls,
          meta: `${o.location} • ${o.type} • Publié le ${new Date(o.publishDate).toLocaleDateString("fr-FR")}`,
          apps: o.applicants > 0 ? `${o.applicants} candidatures` : "",
          buttons: offerButtons(o.status),
        }
      })
    : []

  return (
    <div className="space-y-4">
      <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Tableau de bord</h1>
      <p className="text-sm text-muted-foreground">Bienvenue dans votre espace employeur</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {kpis.map((kpi) => (
            <Card key={kpi.title}><CardContent className="p-4"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{kpi.title}</p><p className="mt-1 text-4xl font-bold">{kpi.value}</p></div><kpi.Icon className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Prochains entretiens</p>
              <div className="flex items-center gap-1 text-xs"><span>Aujourd'hui, 26 Novembre</span><ChevronRight className="h-3.5 w-3.5" /></div>
            </div>
            <div className="rounded-md bg-muted p-2 mb-3">
              <p className="text-xs text-muted-foreground mb-2">Demain, 9:30</p>
              <div className="flex items-center gap-2"><div className="h-8 w-8 rounded-full bg-gray-300" /><p className="text-sm">Mme Estelle</p></div>
            </div>
            <button className="text-xs text-blue-500 hover:underline">Programmer un nouvel interview</button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Evolution des candidatures</CardTitle><p className="text-xs text-muted-foreground">Nombre de candidatures recues par mois</p></CardHeader>
          <CardContent className="pt-2"><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={bars}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} /><Bar dataKey="value" fill="#2f7dea" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Vues des offres</CardTitle><p className="text-xs text-muted-foreground">Nombre de vues de vos offres d'emploi</p></CardHeader>
          <CardContent className="pt-2"><div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={lines}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} /><Line type="monotone" dataKey="value" stroke="#2f7dea" strokeWidth={2} dot={{ r: 2, fill: "#2f7dea" }} /></LineChart></ResponsiveContainer></div></CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-0 bg-gradient-to-r from-blue-500 to-blue-700 text-white">
        <CardContent className="relative p-4">
          <button className="absolute right-2 top-2 text-blue-100"><X className="h-4 w-4" /></button>
          <div className="mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4" /><p className="text-lg sm:text-xl font-semibold">Recommandations IA du jour</p></div>
          <div className="space-y-1 text-xs sm:text-sm text-blue-100">
            <p>• Optimisation d'offres : vos offres ont attire 35% plus de candidats qualifies.</p>
            <p>• Moment ideal : mardi 10h est votre meilleur creneau de publication.</p>
            <p>• Candidat potentiel : 13 profils correspondent a vos criteres de recrutement.</p>
          </div>
          <div className="pointer-events-none absolute -bottom-8 right-2 h-24 w-24 rounded-full border-[18px] border-blue-300/40" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Candidatures recentes (Goriya Score)</CardTitle><button className="inline-flex items-center gap-1 text-xs text-muted-foreground">Voir tout <ChevronRight className="h-3.5 w-3.5" /></button></CardHeader>
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
        <h2 className="text-lg font-semibold">Offres recentes</h2>
        <p className="mb-3 text-xs text-muted-foreground">Apercu de vos dernieres publications</p>
        {recents.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune offre récente.</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {recents.map((o, i) => (
              <Card key={`${o.title}-${i}`}><CardContent className="p-3"><div className="mb-1 flex items-center justify-between gap-2"><p className="text-sm font-semibold">{o.title}</p><Badge className={`text-[10px] ${o.statusClass}`}>{o.status}</Badge></div><p className="text-[11px] text-muted-foreground">{o.meta}</p><div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"><p className="text-xs text-muted-foreground">{o.apps}</p><div className="flex flex-wrap gap-1">{o.buttons.map((b) => <Button key={b} variant="outline" size="sm" className="h-6 px-2 text-[10px]">{b}</Button>)}</div></div></CardContent></Card>
            ))}
          </div>
        )}
      </div>

      <div className="hidden"><Clock3 /><Users /><Bell /><Calendar /><Camera /></div>
    </div>
  )
}
