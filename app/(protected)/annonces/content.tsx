"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Search, Filter, MapPin, Users, Calendar, Edit, Trash2, ListOrdered, Plus } from "lucide-react"
import { extractApiErrorMessage } from "@/lib/api-error"
import { AnnonceContentProps } from "@/@types/props"
import type { IOffer } from "@/@types/interface"
import { deleteJobOffer, updateJobStatus } from "@/actions/offers"
import { JOB_STATUS_META, jobTypeLabel } from "@/lib/data/offres"
import { candidateAssessmentService, type ICandidateRanking } from "@/lib/api/candidate-assessment.service"

type JobStatus = "ACTIVE" | "CLOSED" | "DRAFT"

export function Content({ init }: AnnonceContentProps) {
    const [jobs, setJobs] = useState<IOffer[]>(init?.data ?? [])
    const [query, setQuery] = useState("")
    const [status, setStatus] = useState<string>("all")

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim()
        return jobs.filter((j) => {
            // Un brouillon peut n'avoir encore ni type ni localisation : la
            // recherche ne doit pas s'effondrer dessus.
            const champs = [j.title, j.type, j.location].filter(Boolean).join(" ").toLowerCase()
            const inQ = q.length === 0 || champs.includes(q)
            const inS = status === "all" || j.status === status
            return inQ && inS
        })
    }, [jobs, query, status])

    const handleDelete = async (id: string) => {
        try {
            // ✅ Appel relayé côté navigateur via /api/proxy : le Bearer token est
            // attaché à partir de la session NextAuth côté serveur, jamais exposé au client.
            await deleteJobOffer(id)
            setJobs((prev) => prev.filter((j) => j.id !== id))
            toast.success("Annonce supprimée.")
        } catch (err) {
            console.error("[annonces] delete error:", err)
            toast.error(extractApiErrorMessage(err, "La suppression de l'annonce a échoué."))
        }
    }

    const handleStatusToggle = async (job: IOffer) => {
        const nextStatus: JobStatus = job.status === "ACTIVE" ? "CLOSED" : "ACTIVE"
        try {
            await updateJobStatus(job.id, nextStatus)
            setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: nextStatus } : j))
            toast.success(nextStatus === "ACTIVE" ? "Annonce réactivée." : "Annonce désactivée.")
        } catch (err) {
            console.error("[annonces] status update error:", err)
            toast.error(extractApiErrorMessage(err, "Le changement de statut a échoué."))
        }
    }

    const [compareFor, setCompareFor] = useState<IOffer | null>(null)
    const [ranking, setRanking] = useState<ICandidateRanking[] | null>(null)
    const [compareLoading, setCompareLoading] = useState(false)

    const handleCompare = async (job: IOffer) => {
        setCompareFor(job)
        setRanking(null)
        setCompareLoading(true)
        try {
            const res = await candidateAssessmentService.compareForJobOffer(job.id)
            setRanking(((res as any)?.data ?? res) as ICandidateRanking[])
        } catch (err) {
            console.error("[annonces] compare error:", err)
            setRanking([])
        } finally {
            setCompareLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Mes annonces"
                description="Suivez la performance de vos offres publiées et les candidatures qu'elles reçoivent."
                actions={
                    <Button className="gap-1.5 rounded-full px-5" asChild>
                        <Link href="/poster-offre">
                            <Plus className="h-4 w-4" />
                            Nouvelle offre
                        </Link>
                    </Button>
                }
            />

            <div className="rounded-xl border border-border bg-white p-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une annonce..." className="h-10 pl-9" />
                    </div>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-10 w-full md:w-[190px]"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="ACTIVE">Publiée</SelectItem>
                            <SelectItem value="DRAFT">Brouillon</SelectItem>
                            <SelectItem value="CLOSED">Fermée</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" className="h-10 w-10 self-end md:self-auto"><Filter className="h-4 w-4" /></Button>
                </div>
            </div>

            {filtered.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Aucune annonce trouvée.</p>
            ) : (
                <div className="space-y-3">
                    {filtered.map((job) => {
                        const badge = JOB_STATUS_META[job.status] ?? { label: job.status, className: "bg-gray-200 text-gray-700" }
                        const estBrouillon = job.status === "DRAFT"
                        return (
                            <div key={job.id} className="rounded-xl border border-border bg-white px-4 py-4">
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-xl sm:text-2xl font-bold leading-tight">{job.title}</h2>
                                        <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                            {/* Un brouillon peut n'avoir aucun de ces champs :
                                                on n'affiche que ce qui est renseigné. */}
                                            {job.location && (
                                                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.location}</span>
                                            )}
                                            {job.type && <span>{jobTypeLabel(job.type)}</span>}
                                            {job.salary && <span>{job.salary}</span>}
                                            {estBrouillon && !job.location && !job.type && !job.salary && (
                                                <span className="italic">Brouillon à compléter</span>
                                            )}
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-5 text-sm">
                                            <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-blue-500" />{job.applicants ?? 0} candidatures</span>
                                            {job.publishDate && (
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    {estBrouillon ? "Publication prévue le " : "Publié le "}
                                                    {new Date(job.publishDate).toLocaleDateString("fr-FR")}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-start gap-3 lg:items-end lg:gap-5">
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Un brouillon ne s'active pas d'un clic : il lui
                                                manque en général des champs exigés à la
                                                publication, on repasse donc par le formulaire. */}
                                            {!estBrouillon && (
                                                <>
                                                    <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-md text-sm" onClick={() => handleStatusToggle(job)}>
                                                        {job.status === "ACTIVE" ? "Désactiver" : "Activer"}
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-md text-sm" onClick={() => handleCompare(job)}>
                                                        <ListOrdered className="h-4 w-4" />Comparer
                                                    </Button>
                                                </>
                                            )}
                                            <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-md text-sm" asChild>
                                                <Link href={`/poster-offre?id=${job.id}`}>
                                                    <Edit className="h-4 w-4" />
                                                    {estBrouillon ? "Reprendre" : "Modifier"}
                                                </Link>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:bg-red-50" aria-label="Supprimer l'annonce" onClick={() => handleDelete(job.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <Dialog open={!!compareFor} onOpenChange={(open) => !open && setCompareFor(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Classement des candidats - {compareFor?.title}</DialogTitle>
                    </DialogHeader>
                    {compareLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                        </div>
                    ) : !ranking || ranking.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Pas encore assez de candidats évalués pour cette offre (au moins 2 évaluations IA requises - voir l'onglet Candidatures).
                        </p>
                    ) : (
                        <ol className="space-y-2">
                            {ranking.map((r) => (
                                <li key={r.rank} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2">
                                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white">{r.rank}</span>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{r.name}</p>
                                        <p className="text-xs text-muted-foreground">{r.reason}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
