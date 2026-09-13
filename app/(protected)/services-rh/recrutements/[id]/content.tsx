"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
    ArrowLeft,
    CalendarPlus,
    Check,
    FileText,
    Loader2,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    RotateCcw,
    Sparkles,
    Star,
    Trash2,
    UserCheck,
    UserPlus,
    UserX,
    XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileViewerDialog, type ViewableFile } from "@/components/file-viewer-dialog"
import { ConfirmDialog } from "@/components/rh/confirm-dialog"
import { EmployeeAvatar } from "@/components/rh/employee-avatar"
import { InterviewList } from "@/components/rh/interview-list"
import { KpiCard } from "@/components/rh/kpi-card"
import { CandidateActionsMenu, candidateRef, useRecruitmentWorkflow } from "@/components/rh/recruitment-actions"
import { splitName } from "@/components/rh/recruitment-board"
import { StatusPill } from "@/components/rh/status-pill"
import { CANDIDATE_VISIBLE_STATUS, RECRUITMENT_STAGE_META, formatDate, formatDateTime, sinceLabel } from "@/lib/data/rh"
import { formatAnswerValue } from "@/lib/data/questions"
import { extractApiErrorMessage } from "@/lib/api-error"
import { recruitmentService, type IRecruitmentCandidate, type IRecruitmentNote, type RecruitmentStage } from "@/lib/api/recruitment.service"
import { cn } from "@/lib/utils"

/** Parcours affiché en frise ; « Refusé » est signalé à part. */
const JOURNEY: RecruitmentStage[] = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED"]

/**
 * Dossier d'un candidat : sa candidature, ses entretiens, les notes des
 * recruteurs et l'historique de son parcours dans le pipeline.
 */
export function CandidateDetail({ id }: { id: string }) {
    const [candidate, setCandidate] = useState<IRecruitmentCandidate | null>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [tab, setTab] = useState("candidature")
    const [cvOpen, setCvOpen] = useState(false)

    const load = useCallback(async () => {
        try {
            setCandidate(await recruitmentService.candidate(id))
            setNotFound(false)
            setLoadError(null)
        } catch (err) {
            if ((err as { statusCode?: number })?.statusCode === 404) setNotFound(true)
            else setLoadError(extractApiErrorMessage(err, "Impossible de charger le dossier de ce candidat."))
        }
    }, [id])

    useEffect(() => {
        void load().finally(() => setLoading(false))
    }, [load])

    const workflow = useRecruitmentWorkflow({ onChanged: load })

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (notFound || loadError || !candidate) {
        return (
            <div className="mx-auto max-w-md rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center">
                <UserX className="mx-auto h-10 w-10 text-muted-foreground" />
                <h1 className="mt-3 text-lg font-semibold text-foreground">{notFound ? "Candidat introuvable" : "Dossier indisponible"}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{notFound ? "Cette candidature n'existe pas ou a été supprimée." : loadError}</p>
                <Button asChild className="mt-5"><Link href="/services-rh/recrutements">Retour aux recrutements</Link></Button>
            </div>
        )
    }

    const { firstName, lastName } = splitName(candidate.candidateName)
    const interviews = candidate.interviews ?? []
    const rejected = candidate.stage === "REJECTED"
    const hired = candidate.stage === "HIRED"
    const cvFile: ViewableFile | null = cvOpen && candidate.resume?.url
        ? { name: candidate.resume.name, url: candidate.resume.url, mimeType: candidate.resume.mimeType ?? null }
        : null

    return (
        <div className="space-y-5 pb-8">
            <Link href="/services-rh/recrutements" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Recrutements
            </Link>

            <div className="overflow-hidden rounded-xl border border-border bg-white">
                <div className="h-16 bg-brand-gradient" />
                <div className="px-4 pb-5 sm:px-6">
                    <EmployeeAvatar id={candidate.id} firstName={firstName} lastName={lastName} size="lg" className="-mt-8 ring-4 ring-white" />

                    <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <h1 className="text-2xl font-semibold leading-tight text-foreground">{candidate.candidateName}</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {candidate.jobOffer?.title ? `Candidat·e au poste « ${candidate.jobOffer.title} »` : "Candidature spontanée"}
                                {candidate.candidateTitle ? ` · ${candidate.candidateTitle}` : ""}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                <StatusPill meta={RECRUITMENT_STAGE_META[candidate.stage]} />
                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                                    Reçue le {formatDate(candidate.appliedDate)}
                                </span>
                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground" title="Statut affiché au candidat">
                                    Vu par le candidat : {CANDIDATE_VISIBLE_STATUS[candidate.stage]}
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <a href={`mailto:${candidate.candidateEmail}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                                    <Mail className="h-4 w-4" />
                                    {candidate.candidateEmail}
                                </a>
                                {candidate.candidatePhone && (
                                    <a href={`tel:${candidate.candidatePhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                                        <Phone className="h-4 w-4" />
                                        {candidate.candidatePhone}
                                    </a>
                                )}
                                {candidate.candidateLocation && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4" />
                                        {candidate.candidateLocation}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" onClick={() => workflow.message(candidate)} className="hover:bg-muted hover:text-foreground">
                                <MessageSquare className="h-4 w-4" />
                                Message
                            </Button>
                            {!hired && !rejected && (
                                <Button variant="outline" onClick={() => workflow.schedule(candidateRef(candidate))} className="hover:bg-muted hover:text-foreground">
                                    <CalendarPlus className="h-4 w-4" />
                                    Planifier un entretien
                                </Button>
                            )}
                            {hired ? (
                                <Button onClick={() => workflow.hire(candidate)}>
                                    <UserCheck className="h-4 w-4" />
                                    Fiche employé
                                </Button>
                            ) : !rejected ? (
                                <Button onClick={() => workflow.hire(candidate)} className="bg-brand-gradient text-white">
                                    <UserPlus className="h-4 w-4" />
                                    Embaucher
                                </Button>
                            ) : null}
                            <CandidateActionsMenu candidate={candidate} workflow={workflow} className="h-9 w-9 border border-border" />
                        </div>
                    </div>
                </div>
            </div>

            {rejected ? (
                <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2 text-sm text-red-800">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>
                            Candidature refusée {sinceLabel(candidate.stageSince)}
                            {candidate.rejectionReason ? ` - « ${candidate.rejectionReason} »` : "."}
                        </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => workflow.move(candidate, "SCREENING")} className="border-red-200 bg-white hover:bg-red-100 hover:text-red-800">
                        <RotateCcw className="h-4 w-4" />
                        Reconsidérer
                    </Button>
                </div>
            ) : (
                <StageJourney candidate={candidate} onMove={(stage) => workflow.move(candidate, stage)} />
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard icon={Check} label="Compatibilité avec l'offre" value={candidate.score > 0 ? `${candidate.score} %` : "-"} />
                <KpiCard icon={Sparkles} label="Évaluation IA" value={candidate.assessmentScore !== null ? `${candidate.assessmentScore} / 100` : "-"} hint={candidate.assessmentScore === null ? "à générer depuis Candidatures" : undefined} />
                <KpiCard
                    icon={CalendarPlus}
                    label="Entretiens"
                    value={candidate.interviewsCount}
                    hint={candidate.nextInterview ? `prochain : ${formatDateTime(candidate.nextInterview.scheduledAt)}` : undefined}
                    highlight={candidate.feedbackDueCount > 0}
                    onClick={() => setTab("entretiens")}
                />
                <KpiCard icon={Star} label="Note moyenne" value={candidate.averageRating !== null ? `${candidate.averageRating.toLocaleString("fr-FR")} / 5` : "-"} />
            </div>

            <Tabs value={tab} onValueChange={setTab}>
                <div className="overflow-x-auto">
                    <TabsList>
                        <TabsTrigger value="candidature">Candidature</TabsTrigger>
                        <TabsTrigger value="entretiens">
                            Entretiens
                            {candidate.feedbackDueCount > 0 && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">{candidate.feedbackDueCount}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="notes">
                            Notes
                            {candidate.notesCount > 0 && <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">{candidate.notesCount}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="historique">Historique</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="candidature" className="mt-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="space-y-4 lg:col-span-2">
                            <section className="rounded-xl border border-border bg-white p-4">
                                <h2 className="text-sm font-semibold text-foreground">Message du candidat</h2>
                                {candidate.coverLetter ? (
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{candidate.coverLetter}</p>
                                ) : (
                                    <p className="mt-2 text-sm text-muted-foreground">Aucun message joint à la candidature.</p>
                                )}
                            </section>
                            <section className="rounded-xl border border-border bg-white p-4">
                                <h2 className="text-sm font-semibold text-foreground">Réponses aux questions de l&apos;offre</h2>
                                {(candidate.answers?.length ?? 0) === 0 ? (
                                    <p className="mt-2 text-sm text-muted-foreground">Aucune question n&apos;était configurée sur cette offre.</p>
                                ) : (
                                    <ul className="mt-3 space-y-2">
                                        {candidate.answers?.map((answer) => (
                                            <li key={answer.id} className="rounded-lg border border-border p-3">
                                                <p className="text-xs font-medium text-muted-foreground">{answer.question}</p>
                                                <p className="mt-1 text-sm text-foreground">{formatAnswerValue(answer.type, answer.value)}</p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>
                        <div className="space-y-4">
                            <section className="rounded-xl border border-border bg-white p-4">
                                <h2 className="text-sm font-semibold text-foreground">CV</h2>
                                {candidate.resume?.url ? (
                                    <Button variant="outline" className="mt-3 w-full justify-start gap-2 hover:bg-muted hover:text-foreground" onClick={() => setCvOpen(true)}>
                                        <FileText className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{candidate.resume.name}</span>
                                    </Button>
                                ) : (
                                    <p className="mt-2 text-sm text-muted-foreground">Pas de CV joint à cette candidature.</p>
                                )}
                            </section>
                            <section className="rounded-xl border border-border bg-white p-4">
                                <h2 className="text-sm font-semibold text-foreground">Compétences</h2>
                                {candidate.candidateSkills.length === 0 ? (
                                    <p className="mt-2 text-sm text-muted-foreground">Non renseignées sur son profil Goriya.</p>
                                ) : (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {candidate.candidateSkills.map((skill) => (
                                            <span key={skill} className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">{skill}</span>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="entretiens" className="mt-4 space-y-3">
                    {!hired && !rejected && (
                        <div className="flex justify-end">
                            <Button onClick={() => workflow.schedule(candidateRef(candidate))}>
                                <CalendarPlus className="h-4 w-4" />
                                Planifier un entretien
                            </Button>
                        </div>
                    )}
                    <InterviewList
                        interviews={[...interviews].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))}
                        workflow={workflow}
                        candidate={candidateRef(candidate)}
                        emptyText="Aucun entretien avec ce candidat pour l'instant."
                    />
                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                    <NotesPanel candidate={candidate} onChanged={load} />
                </TabsContent>

                <TabsContent value="historique" className="mt-4">
                    <Timeline candidate={candidate} />
                </TabsContent>
            </Tabs>

            <FileViewerDialog file={cvFile} subtitle={`CV de ${candidate.candidateName}`} onClose={() => setCvOpen(false)} />
            {workflow.dialogs}
        </div>
    )
}

/** Frise du parcours : l'étape courante en couleur, les suivantes cliquables. */
function StageJourney({ candidate, onMove }: { candidate: IRecruitmentCandidate; onMove: (stage: RecruitmentStage) => void }) {
    const current = JOURNEY.indexOf(candidate.stage)

    return (
        <ol className="grid grid-cols-5 gap-1 rounded-xl border border-border bg-white p-2" aria-label="Parcours du candidat">
            {JOURNEY.map((stage, index) => {
                const done = index < current
                const active = index === current
                const reachable = candidate.stage !== "HIRED" && !active
                return (
                    <li key={stage}>
                        <button
                            type="button"
                            disabled={!reachable}
                            onClick={() => onMove(stage)}
                            aria-current={active ? "step" : undefined}
                            title={reachable ? `Passer à l'étape « ${RECRUITMENT_STAGE_META[stage].label} »` : undefined}
                            className={cn(
                                "flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-[11px] font-medium transition-colors sm:flex-row sm:justify-center sm:gap-2 sm:text-xs",
                                active ? "bg-brand-gradient text-white" : done ? "text-primary" : "text-muted-foreground",
                                reachable && "hover:bg-muted",
                            )}
                        >
                            <span
                                className={cn(
                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                                    active ? "bg-white/25 text-white" : done ? "bg-secondary text-primary" : "bg-muted text-muted-foreground",
                                )}
                            >
                                {done ? <Check className="h-3 w-3" /> : index + 1}
                            </span>
                            <span className="truncate">{RECRUITMENT_STAGE_META[stage].label}</span>
                        </button>
                    </li>
                )
            })}
        </ol>
    )
}

function NotesPanel({ candidate, onChanged }: { candidate: IRecruitmentCandidate; onChanged: () => Promise<void> }) {
    const [body, setBody] = useState("")
    const [saving, setSaving] = useState(false)
    const [toDelete, setToDelete] = useState<IRecruitmentNote | null>(null)
    const [deleting, setDeleting] = useState(false)
    const notes = candidate.notes ?? []

    const add = async () => {
        const text = body.trim()
        if (!text) return
        setSaving(true)
        try {
            await recruitmentService.addNote(candidate.id, text)
            setBody("")
            toast.success("Note ajoutée.")
            await onChanged()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "L'ajout de la note a échoué."))
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        if (!toDelete) return
        setDeleting(true)
        try {
            await recruitmentService.removeNote(toDelete.id)
            setToDelete(null)
            toast.success("Note supprimée.")
            await onChanged()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La suppression de la note a échoué."))
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-white p-4">
                <Textarea
                    rows={3}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Impression après un appel, référence prise, point à vérifier… Les notes ne sont jamais visibles du candidat."
                    aria-label="Nouvelle note"
                    disabled={saving}
                />
                <div className="mt-2 flex justify-end">
                    <Button size="sm" disabled={saving || !body.trim()} onClick={() => void add()}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Ajouter la note
                    </Button>
                </div>
            </div>

            {notes.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">Aucune note pour l&apos;instant.</p>
            ) : (
                <ul className="space-y-2">
                    {notes.map((note) => (
                        <li key={note.id} className="rounded-xl border border-border bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                                <p className="whitespace-pre-line text-sm text-foreground">{note.body}</p>
                                <Button size="icon-sm" variant="ghost" aria-label="Supprimer la note" onClick={() => setToDelete(note)} className="shrink-0 text-muted-foreground hover:bg-red-50 hover:text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                                {note.authorName ?? "Recruteur"} · {formatDateTime(note.createdAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                        </li>
                    ))}
                </ul>
            )}

            <ConfirmDialog
                open={!!toDelete}
                onOpenChange={(open) => !open && setToDelete(null)}
                title="Supprimer cette note ?"
                description="Elle disparaît du dossier du candidat pour tous les recruteurs."
                confirmLabel="Supprimer"
                destructive
                loading={deleting}
                onConfirm={remove}
            />
        </div>
    )
}

/** Historique : réception de la candidature, puis chaque changement d'étape et chaque entretien. */
function Timeline({ candidate }: { candidate: IRecruitmentCandidate }) {
    const entries = useMemo(() => {
        const list: { key: string; date: string | null; title: string; detail?: string | null; dot: string }[] = [
            { key: "applied", date: candidate.appliedDate, title: "Candidature reçue", detail: candidate.jobOffer?.title, dot: "bg-slate-400" },
        ]
        for (const event of candidate.history ?? []) {
            list.push({
                key: event.id,
                date: event.createdAt,
                title: event.fromStage
                    ? `${RECRUITMENT_STAGE_META[event.fromStage].label} → ${RECRUITMENT_STAGE_META[event.toStage].label}`
                    : RECRUITMENT_STAGE_META[event.toStage].label,
                detail: [event.authorName ? `par ${event.authorName}` : null, event.comment ? `« ${event.comment} »` : null].filter(Boolean).join(" · "),
                dot: RECRUITMENT_STAGE_META[event.toStage].dot,
            })
        }
        for (const interview of candidate.interviews ?? []) {
            if (interview.status === "SCHEDULED") continue
            list.push({
                key: `interview-${interview.id}`,
                date: interview.scheduledAt,
                title: interview.status === "COMPLETED" ? "Entretien passé" : interview.status === "NO_SHOW" ? "Absent à l'entretien" : "Entretien annulé",
                detail: interview.rating ? `Note ${interview.rating}/5${interview.outcomeByName ? ` · ${interview.outcomeByName}` : ""}` : interview.outcomeByName,
                dot: interview.status === "COMPLETED" ? "bg-green-500" : "bg-gray-400",
            })
        }
        return list.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    }, [candidate])

    return (
        <ol className="relative space-y-4 rounded-xl border border-border bg-white p-4 pl-8">
            <span className="absolute bottom-6 left-[1.3rem] top-6 w-px bg-border" aria-hidden="true" />
            {entries.map((entry) => (
                <li key={entry.key} className="relative">
                    <span className={cn("absolute -left-[0.95rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white", entry.dot)} aria-hidden="true" />
                    <p className="text-sm font-medium text-foreground">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">
                        {formatDateTime(entry.date, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        {entry.detail ? ` · ${entry.detail}` : ""}
                    </p>
                </li>
            ))}
        </ol>
    )
}
