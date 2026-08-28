"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Filter, MapPin, Users, Eye, TrendingUp, Calendar, Edit, MoreHorizontal, Trash2, ListOrdered } from "lucide-react"
import { AnnonceContentProps } from "@/@types/props"
import type { IOffer } from "@/@types/interface"
import { deleteJobOffer, updateJobStatus } from "@/actions/offers"
import { candidateAssessmentService, type ICandidateRanking } from "@/lib/api/candidate-assessment.service"

type JobStatus = "ACTIVE" | "CLOSED" | "DRAFT"

const statusMap: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: "Active", className: "bg-green-500 text-white" },
    DRAFT: { label: "Brouillon", className: "bg-gray-200 text-gray-700" },
    CLOSED: { label: "Fermee", className: "bg-red-500 text-white" },
    PAUSED: { label: "En pause", className: "bg-gray-200 text-gray-700" },
}

export function Content({ init }: AnnonceContentProps) {
    const [jobs, setJobs] = useState<IOffer[]>(init?.data ?? [])
    const [query, setQuery] = useState("")
    const [status, setStatus] = useState<string>("all")

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim()
        return jobs.filter((j) => {
            const inQ = q.length === 0 || j.title.toLowerCase().includes(q) || j.type.toLowerCase().includes(q) || j.location.toLowerCase().includes(q)
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
        } catch (err) {
            console.error("[annonces] delete error:", err)
        }
    }

    const handleStatusToggle = async (job: IOffer) => {
        const nextStatus: JobStatus = job.status === "ACTIVE" ? "CLOSED" : "ACTIVE"
        try {
            await updateJobStatus(job.id, nextStatus)
            setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: nextStatus } : j))
        } catch (err) {
            console.error("[annonces] status update error:", err)
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
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Mes annonces</h1>
                <p className="mt-2 text-sm sm:text-base font-medium text-foreground">Gere et analyse toutes les candidatures recues</p>
            </div>

            <div className="rounded-xl border border-border bg-white p-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une annonce..." className="h-10 pl-9" />
                    </div>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-10 w-full md:w-[170px]"><SelectValue placeholder="Tous les status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les status</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="DRAFT">Brouillon</SelectItem>
                            <SelectItem value="CLOSED">Fermee</SelectItem>
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
                        const badge = statusMap[job.status] ?? { label: job.status, className: "bg-gray-200 text-gray-700" }
                        return (
                            <div key={job.id} className="rounded-xl border border-border bg-white px-4 py-4">
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-xl sm:text-2xl font-bold leading-tight">{job.title}</h2>
                                        <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.location}</span>
                                            <span>{job.type}</span>
                                            <span>{job.salary}</span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-5 text-sm">
                                            <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-blue-500" />{job.applicants} candidatures</span>
                                            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-muted-foreground" />Publié le {new Date(job.publishDate).toLocaleDateString("fr-FR")}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-row lg:flex-col lg:items-end items-center justify-between gap-3 lg:gap-5">
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-md text-sm" onClick={() => handleStatusToggle(job)}>
                                                {job.status === "ACTIVE" ? "Désactiver" : "Activer"}
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-md text-sm" onClick={() => handleCompare(job)}>
                                                <ListOrdered className="h-4 w-4" />Comparer
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-md text-sm">
                                                <Edit className="h-4 w-4" />Modifier
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:bg-red-50" onClick={() => handleDelete(job.id)}>
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

            <div className="hidden"><Link href="/poster-offre">Publier une annonce</Link></div>

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
