"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, MapPin, Phone, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { INTERVIEW_TYPE_META, toDatetimeLocal } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { recruitmentService, type IRecruitmentInterview, type InterviewType } from "@/lib/api/recruitment.service"
import { cn } from "@/lib/utils"

/** Candidat visé par une action du pipeline : de quoi titrer une modale. */
export type CandidateRef = { id: string; name: string; jobOfferTitle?: string | null }

interface InterviewDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    candidate: CandidateRef | null
    /** Entretien à modifier ; absent pour en planifier un nouveau. */
    interview?: IRecruitmentInterview | null
    onSaved: (interview: IRecruitmentInterview) => void
}

const TYPE_ICONS = { PHONE: Phone, VIDEO: Video, ONSITE: MapPin } as const
const DURATIONS = [15, 30, 45, 60, 90, 120]

/** Demain, 10 h : un créneau plausible plutôt qu'un champ vide. */
function defaultStart(): string {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    date.setHours(10, 0, 0, 0)
    return toDatetimeLocal(date)
}

/**
 * Planification (ou modification) d'un entretien. En visio, une salle GORIYA
 * Meet est ouverte : le recruteur la rejoint depuis la liste des entretiens,
 * le candidat depuis son espace Goriya Meet. Le candidat est convoqué par une
 * notification Goriya, sauf si on décoche - ou si la date est déjà passée.
 */
export function InterviewDialog({ open, onOpenChange, candidate, interview, onSaved }: InterviewDialogProps) {
    const [type, setType] = useState<InterviewType>("VIDEO")
    const [when, setWhen] = useState("")
    const [duration, setDuration] = useState("45")
    const [location, setLocation] = useState("")
    const [interviewers, setInterviewers] = useState("")
    const [description, setDescription] = useState("")
    const [notify, setNotify] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!open) return
        setType(interview?.type ?? "VIDEO")
        setWhen(interview ? toDatetimeLocal(interview.scheduledAt) : defaultStart())
        setDuration(String(interview?.durationMinutes ?? 45))
        setLocation(interview?.location ?? "")
        setInterviewers(interview?.interviewers ?? "")
        setDescription(interview?.description ?? "")
        setNotify(true)
        setError(null)
    }, [open, interview])

    if (!candidate) return null

    const start = when ? new Date(when) : null
    const inPast = !!start && start.getTime() < Date.now()
    const changed = !!interview && !!start && (start.getTime() !== new Date(interview.scheduledAt).getTime() || type !== interview.type)
    const meta = INTERVIEW_TYPE_META[type]

    const submit = async () => {
        if (!start || Number.isNaN(start.getTime())) return setError("Indiquez la date et l'heure de l'entretien.")
        setSaving(true)
        setError(null)
        const payload = {
            type,
            scheduledAt: start.toISOString(),
            durationMinutes: Number(duration),
            location: type === "VIDEO" ? null : location.trim() || null,
            interviewers: interviewers.trim() || null,
            description: description.trim() || null,
            notifyCandidate: notify,
        }
        try {
            const saved = interview
                ? await recruitmentService.updateInterview(interview.id, payload)
                : await recruitmentService.scheduleInterview(candidate.id, payload)
            toast.success(
                interview
                    ? "Entretien mis à jour."
                    : `Entretien planifié avec ${candidate.name}${saved.candidateNotifiedAt ? " : candidat convoqué." : "."}`,
            )
            onSaved(saved)
            onOpenChange(false)
        } catch (err) {
            const message = extractApiErrorMessage(err, "L'enregistrement de l'entretien a échoué.")
            setError(message)
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    const showNotify = !inPast && (!interview || changed)

    return (
        <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{interview ? "Modifier l'entretien" : "Planifier un entretien"}</DialogTitle>
                    <DialogDescription>
                        {candidate.name}
                        {candidate.jobOfferTitle ? ` · ${candidate.jobOfferTitle}` : ""}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <p className="mb-1.5 text-sm font-medium text-foreground">Format</p>
                        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Format de l'entretien">
                            {(Object.keys(INTERVIEW_TYPE_META) as InterviewType[]).map((value) => {
                                const Icon = TYPE_ICONS[value]
                                const selected = type === value
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        onClick={() => setType(value)}
                                        className={cn(
                                            "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors",
                                            selected ? "border-primary bg-secondary text-primary" : "border-border text-muted-foreground hover:bg-muted",
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {INTERVIEW_TYPE_META[value].label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_9rem]">
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-foreground">Date et heure</span>
                            <Input type="datetime-local" value={when} onChange={(e) => { setWhen(e.target.value); setError(null) }} />
                        </label>
                        <div>
                            <p className="mb-1.5 text-sm font-medium text-foreground">Durée</p>
                            <Select value={duration} onValueChange={setDuration}>
                                <SelectTrigger className="w-full" aria-label="Durée"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d < 60 ? `${d} min` : `${Math.floor(d / 60)} h${d % 60 ? ` ${d % 60}` : ""}`}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {type === "VIDEO" ? (
                        <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-secondary/50 px-3 py-2.5 text-sm">
                            <Video className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <p className="text-foreground">
                                Une salle <strong>GORIYA Meet</strong> est ouverte pour cet entretien. Vous la rejoignez depuis la liste des
                                entretiens ; le candidat, depuis son espace Goriya Meet. Elle se ferme une fois l&apos;entretien passé ou annulé.
                            </p>
                        </div>
                    ) : (
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-foreground">{meta.locationLabel}</span>
                            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={meta.locationPlaceholder} />
                        </label>
                    )}

                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-foreground">Intervenants</span>
                        <Input value={interviewers} onChange={(e) => setInterviewers(e.target.value)} placeholder="Awa Koné (RH), Yao N'Guessan (manager)…" />
                    </label>

                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-foreground">Préparation</span>
                        <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Points à creuser, test à faire passer… (visible des recruteurs seulement)" />
                    </label>

                    {showNotify ? (
                        <label className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-foreground">
                            <Checkbox checked={notify} onCheckedChange={(v) => setNotify(v === true)} className="mt-0.5" />
                            <span>
                                {interview ? "Prévenir le candidat du changement" : "Convoquer le candidat"}
                                <span className="block text-xs text-muted-foreground">
                                    Notification Goriya avec la date, le format
                                    {type === "VIDEO" ? " et l'accès à la salle GORIYA Meet" : type === "ONSITE" ? " et l'adresse" : ""}.
                                </span>
                            </span>
                        </label>
                    ) : inPast ? (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            Date passée : l&apos;entretien est enregistré sans prévenir le candidat. Rédigez ensuite son compte rendu.
                        </p>
                    ) : null}

                    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button disabled={saving} onClick={() => void submit()}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {interview ? "Enregistrer" : "Planifier"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
