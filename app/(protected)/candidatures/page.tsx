"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Search, User, MapPin, Calendar, Star, FileText, MessageSquare, Plus, Check, X, Sparkles, Download } from "lucide-react"
import { apiRequest } from "@/lib/api-client-http"
import { createConversation } from "@/actions/messages"
import type { ICandidate } from "@/@types/interface"
import { SubscriptionGate } from "@/components/subscription-gate"
import { candidateAssessmentService, type ICandidateAssessment } from "@/lib/api/candidate-assessment.service"

type UIStatus = "pending" | "interview" | "accepted" | "rejected" | "analyzed"

const BACKEND_TO_UI: Record<string, UIStatus> = {
    EN_ATTENTE: "pending",
    EN_COURS: "interview",
    APPROUVEE: "accepted",
    REJETEE: "rejected",
    ACCEPTEE: "accepted",
    REFUSEE: "rejected",
}

const STATUS_META: Record<UIStatus, { label: string; statusClass: string }> = {
    pending: { label: "En attente", statusClass: "bg-orange-100 text-orange-500" },
    interview: { label: "Entretien programme", statusClass: "bg-blue-100 text-blue-600" },
    analyzed: { label: "CV analyse", statusClass: "bg-gray-100 text-gray-500" },
    accepted: { label: "Accepte", statusClass: "bg-green-500 text-white" },
    rejected: { label: "Refuse", statusClass: "bg-red-500 text-white" },
}

const TAB_LABELS = [
    { key: "all" as const, label: "Toutes" },
    { key: "pending" as const, label: "En attente" },
    { key: "interview" as const, label: "Entretiens" },
    { key: "analyzed" as const, label: "Analysees" },
    { key: "accepted" as const, label: "Acceptees" },
    { key: "rejected" as const, label: "Refusees" },
]

function CandidaturesContent() {
    const router = useRouter()
    const [candidates, setCandidates] = useState<ICandidate[]>([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState("")
    const [jobFilter, setJobFilter] = useState("all")
    const [tab, setTab] = useState<(typeof TAB_LABELS)[number]["key"]>("all")
    const [messaging, setMessaging] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await apiRequest<any>({ endpoint: "/candidatures/paginate", method: "GET", params: { page: 1, limit: 50 } })
                const items = res?.data ?? res ?? []
                setCandidates(Array.isArray(items) ? items : [])
            } catch (err) {
                console.error("[candidatures] load error:", err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    // Pas de route dédiée /candidatures/{id}/status côté backend - PATCH
    // /candidatures/{id} accepte déjà `status` et vérifie que l'appelant est
    // bien le candidat ou l'entreprise propriétaire de l'offre concernée.
    const handleAccept = async (id: string) => {
        try {
            await apiRequest({ endpoint: `/candidatures/${id}`, method: "PATCH", data: { status: "APPROUVEE" } })
            setCandidates((prev) => prev.map((c) => c.id === id ? { ...c, status: "ACCEPTEE" as any } : c))
        } catch (err) {
            console.error("[candidatures] accept error:", err)
        }
    }

    const handleReject = async (id: string) => {
        try {
            await apiRequest({ endpoint: `/candidatures/${id}`, method: "PATCH", data: { status: "REJETEE" } })
            setCandidates((prev) => prev.map((c) => c.id === id ? { ...c, status: "REFUSEE" as any } : c))
        } catch (err) {
            console.error("[candidatures] reject error:", err)
        }
    }

    const handleMessage = async (candidatureId: string) => {
        setMessaging(candidatureId)
        try {
            const res = await createConversation(candidatureId)
            const conversation = (res as any)?.data ?? res
            router.push(`/messages?conversation=${conversation.id}`)
        } catch (err) {
            console.error("[candidatures] createConversation error:", err)
        } finally {
            setMessaging(null)
        }
    }

    const [assessmentFor, setAssessmentFor] = useState<ICandidate | null>(null)
    const [assessment, setAssessment] = useState<ICandidateAssessment | null>(null)
    const [assessmentLoading, setAssessmentLoading] = useState(false)
    const [exchangeNotes, setExchangeNotes] = useState("")

    const openAssessment = async (candidate: ICandidate) => {
        setAssessmentFor(candidate)
        setAssessment(null)
        setExchangeNotes("")
        setAssessmentLoading(true)
        try {
            const res = await candidateAssessmentService.get(candidate.id)
            setAssessment((res as any)?.data ?? res)
        } catch {
            // Pas encore d'évaluation générée pour cette candidature - normal, l'utilisateur peut en lancer une.
            setAssessment(null)
        } finally {
            setAssessmentLoading(false)
        }
    }

    const generateAssessment = async () => {
        if (!assessmentFor) return
        setAssessmentLoading(true)
        try {
            const res = await candidateAssessmentService.generate(assessmentFor.id, exchangeNotes || undefined)
            setAssessment((res as any)?.data ?? res)
        } catch (err) {
            console.error("[candidatures] assessment generate error:", err)
        } finally {
            setAssessmentLoading(false)
        }
    }

    const uiStatus = (c: ICandidate): UIStatus => BACKEND_TO_UI[c.status] ?? "pending"

    const counts = useMemo(() => ({
        all: candidates.length,
        pending: candidates.filter((c) => uiStatus(c) === "pending").length,
        interview: candidates.filter((c) => uiStatus(c) === "interview").length,
        analyzed: candidates.filter((c) => uiStatus(c) === "analyzed").length,
        accepted: candidates.filter((c) => uiStatus(c) === "accepted").length,
        rejected: candidates.filter((c) => uiStatus(c) === "rejected").length,
    }), [candidates])

    const filtered = useMemo(() => {
        return candidates.filter((candidate) => {
            const us = uiStatus(candidate)
            const inTab = tab === "all" || us === tab
            const q = query.toLowerCase().trim()
            const inSearch = q.length === 0 || candidate.name.toLowerCase().includes(q) || candidate.email.toLowerCase().includes(q)
            return inTab && inSearch
        })
    }, [jobFilter, query, tab, candidates])

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Candidatures</h1>

            <div className="rounded-xl border border-border bg-white p-3 space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un candidat ou un poste..." className="h-10 pl-9" />
                    </div>
                    <Select value={jobFilter} onValueChange={setJobFilter}>
                        <SelectTrigger className="h-10 w-full md:w-[220px]"><SelectValue placeholder="Tous les postes" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les postes</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="overflow-x-auto">
                    <div className="grid min-w-[720px] grid-cols-6 overflow-hidden rounded-lg border border-border bg-muted/35 text-xs">
                        {TAB_LABELS.map((item, i) => (
                            <button key={item.key} onClick={() => setTab(item.key)} className={`py-2.5 text-center transition-colors ${tab === item.key ? "bg-white text-foreground" : "text-muted-foreground hover:bg-muted/60"} ${i > 0 ? "border-l border-border" : ""}`}>
                                {item.label} ({counts[item.key]})
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {filtered.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Aucune candidature trouvée.</p>
            ) : (
                <div className="space-y-3">
                    {filtered.map((candidate) => {
                        const us = uiStatus(candidate)
                        const meta = STATUS_META[us]
                        return (
                            <div key={candidate.id} className="rounded-xl border border-border bg-white px-4 py-4">
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500">
                                                <User className="h-4 w-4 text-white" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1 flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-lg font-semibold text-foreground">{candidate.name}</h3>
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.statusClass}`}>{meta.label}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">{candidate.email}</p>
                                                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(candidate.appliedDate).toLocaleDateString("fr-FR")}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2.5 text-xs text-blue-500">Compatibilite IA</div>
                                        <div className="mt-1 flex items-center gap-3">
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-100">
                                                <div className="h-full rounded-full bg-blue-500" style={{ width: `${candidate.score}%` }} />
                                            </div>
                                            <span className={`w-8 text-right text-xs font-semibold ${candidate.score >= 90 ? "text-green-500" : candidate.score >= 80 ? "text-blue-500" : "text-muted-foreground"}`}>{candidate.score}%</span>
                                        </div>
                                    </div>

                                    <div className="w-full lg:w-[165px] shrink-0">
                                        <div className="mb-2 flex items-center lg:justify-end gap-1 text-sm font-semibold text-foreground">
                                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                            <span>{candidate.score}</span>
                                            <span className="text-muted-foreground">/100</span>
                                        </div>
                                        <p className="-mt-1 mb-2 lg:text-right text-[10px] text-muted-foreground">Score IA</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                                            <Button size="sm" className="h-8 w-full justify-center gap-1 rounded-md bg-blue-500 text-xs hover:bg-blue-600"><FileText className="h-3.5 w-3.5" />Voir CV</Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-full justify-center gap-1 rounded-md text-xs"
                                                disabled={messaging === candidate.id}
                                                onClick={() => handleMessage(candidate.id)}
                                            >
                                                <MessageSquare className="h-3.5 w-3.5" />Message
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-full justify-center gap-1 rounded-md text-xs"
                                                onClick={() => openAssessment(candidate)}
                                            >
                                                <Sparkles className="h-3.5 w-3.5" />Évaluation IA
                                            </Button>
                                        </div>
                                        {us === "pending" && (
                                            <div className="mt-2 overflow-hidden rounded-md border border-border bg-white shadow-sm">
                                                <button className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-green-600 hover:bg-green-50" onClick={() => handleAccept(candidate.id)}>
                                                    <Check className="h-3.5 w-3.5" /> Accepter
                                                </button>
                                                <button className="flex w-full items-center gap-1.5 border-t border-border px-3 py-1.5 text-xs text-red-500 hover:bg-red-50" onClick={() => handleReject(candidate.id)}>
                                                    <X className="h-3.5 w-3.5" /> Refuser
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <Dialog open={!!assessmentFor} onOpenChange={(open) => !open && setAssessmentFor(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Évaluation IA - {assessmentFor?.name}</DialogTitle>
                    </DialogHeader>

                    {assessmentLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                        </div>
                    ) : assessment ? (
                        <div className="space-y-4">
                            {assessment.status === "PENDING" ? (
                                <p className="text-sm text-muted-foreground">Évaluation en cours de génération...</p>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        <ScoreRow label="Score global" value={assessment.overallScore} />
                                        <ScoreRow label="Compétences techniques" value={assessment.technicalScore} />
                                        <ScoreRow label="Soft skills" value={assessment.softSkillsScore} />
                                        <ScoreRow label="Adéquation culturelle" value={assessment.culturalFitScore} />
                                    </div>
                                    {assessment.softSkillsFeedback && (
                                        <div>
                                            <p className="mb-1 text-xs font-medium text-foreground">Feedback</p>
                                            <p className="text-sm text-muted-foreground">{assessment.softSkillsFeedback}</p>
                                        </div>
                                    )}
                                    {assessment.skillsTest && assessment.skillsTest.length > 0 && (
                                        <div>
                                            <p className="mb-1 text-xs font-medium text-foreground">Questions suggérées pour l'entretien</p>
                                            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                                                {assessment.skillsTest.map((q, i) => (
                                                    <li key={i}>{q.question} <span className="text-[10px] uppercase text-muted-foreground/70">({q.type})</span></li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <a href={candidateAssessmentService.reportUrl(assessmentFor!.id)} target="_blank" rel="noreferrer" className="flex-1">
                                            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs"><Download className="h-3.5 w-3.5" />Télécharger le rapport (.docx)</Button>
                                        </a>
                                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={assessmentLoading} onClick={generateAssessment}>
                                            <Sparkles className="h-3.5 w-3.5" />Régénérer
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">Aucune évaluation générée pour cette candidature.</p>
                            <Textarea
                                value={exchangeNotes}
                                onChange={(e) => setExchangeNotes(e.target.value)}
                                placeholder="Notes d'échange avec le candidat (optionnel, améliore la précision de l'évaluation)..."
                                className="min-h-[80px] text-sm"
                            />
                            <Button size="sm" className="w-full gap-1.5 bg-blue-500 text-xs hover:bg-blue-600" onClick={generateAssessment}>
                                <Sparkles className="h-3.5 w-3.5" />Générer l'évaluation IA
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

function ScoreRow({ label, value }: { label: string; value: number | null }) {
    return (
        <div>
            <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-foreground">{label}</span>
                <span className="font-semibold text-foreground">{value ?? "-"}{value !== null ? "/100" : ""}</span>
            </div>
            <Progress value={value ?? 0} className="h-1.5" />
        </div>
    )
}

export default function Page() {
    return (
        <SubscriptionGate featureLabel="la gestion des candidatures">
            <CandidaturesContent />
        </SubscriptionGate>
    )
}
