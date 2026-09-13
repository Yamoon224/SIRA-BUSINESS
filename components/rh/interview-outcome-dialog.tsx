"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { CandidateRef } from "@/components/rh/interview-dialog"
import { INTERVIEW_TYPE_META, RECOMMENDATION_META, formatDateTime } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import {
    recruitmentService,
    type IRecruitmentInterview,
    type InterviewOutcome,
    type InterviewRecommendation,
} from "@/lib/api/recruitment.service"
import { cn } from "@/lib/utils"

interface InterviewOutcomeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    candidate: CandidateRef | null
    interview: IRecruitmentInterview | null
    /** Issue présélectionnée (« Annuler l'entretien » ouvre directement l'annulation). */
    preset?: InterviewOutcome
    onSaved: (interview: IRecruitmentInterview) => void
}

const OUTCOMES: { value: InterviewOutcome; label: string }[] = [
    { value: "COMPLETED", label: "Entretien passé" },
    { value: "NO_SHOW", label: "Candidat absent" },
    { value: "CANCELLED", label: "Annulé" },
]

const RATING_HINTS = ["", "Insuffisant", "Réservé", "Correct", "Bon", "Excellent"]

/**
 * Compte rendu d'un entretien : note sur 5 et avis quand il a eu lieu, motif
 * d'une absence ou d'une annulation sinon. Un compte rendu se complète après coup.
 */
export function InterviewOutcomeDialog({ open, onOpenChange, candidate, interview, preset, onSaved }: InterviewOutcomeDialogProps) {
    const [status, setStatus] = useState<InterviewOutcome>("COMPLETED")
    const [rating, setRating] = useState<number | null>(null)
    const [recommendation, setRecommendation] = useState<InterviewRecommendation | null>(null)
    const [feedback, setFeedback] = useState("")
    const [notify, setNotify] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!open || !interview) return
        setStatus(preset ?? (interview.status === "SCHEDULED" ? "COMPLETED" : (interview.status as InterviewOutcome)))
        setRating(interview.rating)
        setRecommendation(interview.recommendation)
        setFeedback(interview.feedback ?? "")
        setNotify(true)
        setError(null)
    }, [open, interview, preset])

    if (!interview || !candidate) return null

    const editing = interview.status === "COMPLETED"
    const canWarn = status === "CANCELLED" && !!interview.candidateNotifiedAt && new Date(interview.scheduledAt).getTime() > Date.now()

    const submit = async () => {
        if (status === "COMPLETED" && !rating) return setError("Donnez une note sur 5 : elle alimente la note moyenne du candidat.")
        setSaving(true)
        setError(null)
        try {
            const saved = await recruitmentService.recordOutcome(interview.id, {
                status,
                rating: status === "COMPLETED" ? rating : null,
                recommendation: status === "COMPLETED" ? recommendation : null,
                feedback: feedback.trim() || null,
                notifyCandidate: canWarn ? notify : false,
            })
            toast.success(
                status === "COMPLETED" ? "Compte rendu enregistré." : status === "CANCELLED" ? "Entretien annulé." : "Absence du candidat enregistrée.",
            )
            onSaved(saved)
            onOpenChange(false)
        } catch (err) {
            const message = extractApiErrorMessage(err, "L'enregistrement a échoué.")
            setError(message)
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{status === "CANCELLED" && preset === "CANCELLED" ? "Annuler l'entretien" : "Compte rendu d'entretien"}</DialogTitle>
                    <DialogDescription>
                        {candidate.name} · {INTERVIEW_TYPE_META[interview.type].label} · {formatDateTime(interview.scheduledAt)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {!editing && preset !== "CANCELLED" && (
                        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Issue de l'entretien">
                            {OUTCOMES.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={status === option.value}
                                    onClick={() => { setStatus(option.value); setError(null) }}
                                    className={cn(
                                        "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                                        status === option.value ? "border-primary bg-secondary text-primary" : "border-border text-muted-foreground hover:bg-muted",
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {status === "COMPLETED" && (
                        <>
                            <div>
                                <p className="mb-1.5 text-sm font-medium text-foreground">Note</p>
                                <div className="flex items-center gap-1" role="radiogroup" aria-label="Note sur 5">
                                    {[1, 2, 3, 4, 5].map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            role="radio"
                                            aria-checked={rating === value}
                                            aria-label={`${value} sur 5 - ${RATING_HINTS[value]}`}
                                            onClick={() => { setRating(value); setError(null) }}
                                            className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <Star className={cn("h-7 w-7 transition-colors", rating && value <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                                        </button>
                                    ))}
                                    {rating && <span className="ml-2 text-sm text-muted-foreground">{RATING_HINTS[rating]}</span>}
                                </div>
                            </div>
                            <div>
                                <p className="mb-1.5 text-sm font-medium text-foreground">Avis</p>
                                <div className="flex flex-wrap gap-2">
                                    {(Object.keys(RECOMMENDATION_META) as InterviewRecommendation[]).map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            aria-pressed={recommendation === value}
                                            onClick={() => setRecommendation(recommendation === value ? null : value)}
                                            className={cn(
                                                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                                                recommendation === value ? cn("border-transparent", RECOMMENDATION_META[value].className) : "border-border text-muted-foreground hover:bg-muted",
                                            )}
                                        >
                                            {RECOMMENDATION_META[value].label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-foreground">
                            {status === "COMPLETED" ? "Compte rendu" : status === "CANCELLED" ? "Motif de l'annulation" : "Commentaire"}
                        </span>
                        <Textarea
                            rows={status === "COMPLETED" ? 5 : 3}
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder={status === "COMPLETED" ? "Points forts, points de vigilance, prétentions, disponibilité…" : "Facultatif, conservé en interne"}
                        />
                    </label>

                    {canWarn && (
                        <label className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-foreground">
                            <Checkbox checked={notify} onCheckedChange={(v) => setNotify(v === true)} className="mt-0.5" />
                            <span>
                                Prévenir le candidat de l&apos;annulation
                                <span className="block text-xs text-muted-foreground">Il avait été convoqué : il reçoit une notification Goriya, sans le motif.</span>
                            </span>
                        </label>
                    )}

                    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Fermer</Button>
                    <Button
                        disabled={saving}
                        onClick={() => void submit()}
                        className={cn(status === "CANCELLED" && "bg-red-500 text-white hover:bg-red-600")}
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {status === "CANCELLED" ? "Annuler l'entretien" : "Enregistrer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
