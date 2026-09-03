"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Search, User, Calendar, Star, FileText, MessageSquare, Check, X, Sparkles, Download, Loader2, Send } from "lucide-react"
import { apiRequest } from "@/lib/api-client-http"
import { createConversation, sendMessage } from "@/actions/messages"
import { extractApiErrorMessage } from "@/lib/api-error"
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

    // Modale de message : la conversation est créée à l'ouverture, l'envoi et
    // ses erreurs restent dans la modale.
    const [messageFor, setMessageFor] = useState<ICandidate | null>(null)
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [messageText, setMessageText] = useState("")
    const [messaging, setMessaging] = useState(false)
    const [sending, setSending] = useState(false)
    const [messageSent, setMessageSent] = useState(false)
    const [messageError, setMessageError] = useState<string | null>(null)

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

    /**
     * Ouvre la modale de message pour une candidature et prépare la
     * conversation en arrière-plan. Auparavant, l'action « Message » quittait
     * la page pour /messages : on perdait le tri et les filtres en cours pour
     * écrire deux lignes.
     */
    const openMessage = async (candidate: ICandidate) => {
        setMessageFor(candidate)
        setMessageText("")
        setMessageError(null)
        setMessageSent(false)
        setConversationId(null)
        setMessaging(true)
        try {
            const res = await createConversation(candidate.id)
            const conversation = (res as any)?.data ?? res
            if (!conversation?.id) throw new Error("Conversation introuvable")
            setConversationId(String(conversation.id))
        } catch (err) {
            console.error("[candidatures] createConversation error:", err)
            setMessageError(
                extractApiErrorMessage(err, "Impossible d'ouvrir la conversation avec ce candidat."),
            )
        } finally {
            setMessaging(false)
        }
    }

    const handleSendMessage = async () => {
        const contenu = messageText.trim()
        if (!contenu) {
            setMessageError("Écrivez un message avant de l'envoyer.")
            return
        }
        if (!conversationId) return

        setSending(true)
        setMessageError(null)
        try {
            await sendMessage(conversationId, contenu)
            setMessageSent(true)
            setMessageText("")
        } catch (err) {
            console.error("[candidatures] sendMessage error:", err)
            setMessageError(extractApiErrorMessage(err, "L'envoi du message a échoué."))
        } finally {
            setSending(false)
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
                /* Deux candidatures par ligne dès le desktop ; une seule en
                   dessous, la carte n'ayant plus la largeur d'afficher ses
                   actions côte à côte. `items-stretch` (défaut de la grille) +
                   `h-full` gardent des cartes de hauteur égale sur une ligne. */
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {filtered.map((candidate) => {
                        const us = uiStatus(candidate)
                        const meta = STATUS_META[us]
                        return (
                            <div key={candidate.id} className="flex h-full flex-col rounded-xl border border-border bg-white px-4 py-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500">
                                        <User className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">{candidate.name}</h3>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.statusClass}`}>{meta.label}</span>
                                        </div>
                                        <p className="truncate text-sm text-muted-foreground">{candidate.email}</p>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(candidate.appliedDate).toLocaleDateString("fr-FR")}</span>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground">
                                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                        <span>{candidate.score}</span>
                                        <span className="text-muted-foreground">/100</span>
                                    </div>
                                </div>

                                <div className="mt-3 text-xs text-blue-500">Compatibilite IA</div>
                                <div className="mt-1 flex items-center gap-3">
                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-100">
                                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${candidate.score}%` }} />
                                    </div>
                                    <span className={`w-8 text-right text-xs font-semibold ${candidate.score >= 90 ? "text-green-500" : candidate.score >= 80 ? "text-blue-500" : "text-muted-foreground"}`}>{candidate.score}%</span>
                                </div>

                                {/* `mt-auto` colle le bloc d'actions en bas : les
                                    cartes d'une même ligne alignent leurs boutons. */}
                                <div className="mt-auto pt-4">
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        <Button size="sm" className="h-8 w-full justify-center gap-1 rounded-md bg-blue-500 text-xs hover:bg-blue-600"><FileText className="h-3.5 w-3.5" />Voir CV</Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-full justify-center gap-1 rounded-md text-xs"
                                            onClick={() => openMessage(candidate)}
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
                                        <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-md border border-border bg-white shadow-sm">
                                            <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-green-600 hover:bg-green-50" onClick={() => handleAccept(candidate.id)}>
                                                <Check className="h-3.5 w-3.5" /> Accepter
                                            </button>
                                            <button className="flex items-center justify-center gap-1.5 border-l border-border px-3 py-1.5 text-xs text-red-500 hover:bg-red-50" onClick={() => handleReject(candidate.id)}>
                                                <X className="h-3.5 w-3.5" /> Refuser
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <Dialog open={!!messageFor} onOpenChange={(open) => !open && setMessageFor(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Message à {messageFor?.name}</DialogTitle>
                        <DialogDescription>{messageFor?.email}</DialogDescription>
                    </DialogHeader>

                    {messaging ? (
                        <div className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                            Ouverture de la conversation…
                        </div>
                    ) : messageSent ? (
                        <div className="space-y-4 py-2">
                            <p className="flex items-center gap-2 text-sm text-green-600">
                                <Check className="h-4 w-4" />
                                Message envoyé à {messageFor?.name}.
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <Button variant="outline" size="sm" onClick={() => setMessageFor(null)}>
                                    Fermer
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-blue-500 hover:bg-blue-600"
                                    onClick={() => router.push(`/messages?conversation=${conversationId}`)}
                                >
                                    Ouvrir la conversation
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <Textarea
                                value={messageText}
                                onChange={(e) => {
                                    setMessageText(e.target.value)
                                    if (messageError) setMessageError(null)
                                }}
                                placeholder="Bonjour, votre candidature a retenu notre attention…"
                                aria-invalid={!!messageError}
                                aria-label="Votre message"
                                disabled={!conversationId || sending}
                                className="min-h-[140px] text-sm"
                            />
                            {messageError && <p className="text-xs text-destructive">{messageError}</p>}

                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <Button variant="outline" size="sm" disabled={sending} onClick={() => setMessageFor(null)}>
                                    Annuler
                                </Button>
                                <Button
                                    size="sm"
                                    className="gap-1.5 bg-blue-500 hover:bg-blue-600"
                                    disabled={sending || !conversationId || messageText.trim().length === 0}
                                    onClick={handleSendMessage}
                                >
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    Envoyer
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

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
