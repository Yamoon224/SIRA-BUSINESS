"use client"

import Link from "next/link"
import { Ban, ClipboardCheck, ExternalLink, MapPin, MoreHorizontal, Pencil, Phone, Star, Trash2, UserX, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CandidateRef } from "@/components/rh/interview-dialog"
import type { RecruitmentWorkflow } from "@/components/rh/recruitment-actions"
import { StatusPill } from "@/components/rh/status-pill"
import { INTERVIEW_STATUS_META, INTERVIEW_TYPE_META, RECOMMENDATION_META, formatTime } from "@/lib/data/rh"
import type { IRecruitmentInterview } from "@/lib/api/recruitment.service"
import { cn } from "@/lib/utils"

const TYPE_ICONS = { PHONE: Phone, VIDEO: Video, ONSITE: MapPin } as const

interface InterviewListProps {
    interviews: IRecruitmentInterview[]
    workflow: RecruitmentWorkflow
    /** Liste de l'entreprise : chaque entretien nomme son candidat. */
    showCandidate?: boolean
    /** Dossier d'un candidat : le candidat commun à tous les entretiens. */
    candidate?: CandidateRef
    emptyText: string
}

export function RatingStars({ value, className }: { value: number; className?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`Note : ${value} sur 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={cn("h-3.5 w-3.5", i <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
            ))}
        </span>
    )
}

/** Entretiens en liste : date, format, lien ou adresse, compte rendu et actions. */
export function InterviewList({ interviews, workflow, showCandidate = false, candidate, emptyText }: InterviewListProps) {
    if (interviews.length === 0) {
        return <p className="rounded-xl border border-dashed border-border bg-white px-6 py-8 text-center text-sm text-muted-foreground">{emptyText}</p>
    }

    return (
        <ul className="space-y-2">
            {interviews.map((interview) => (
                <InterviewItem key={interview.id} interview={interview} workflow={workflow} showCandidate={showCandidate} candidate={candidate} />
            ))}
        </ul>
    )
}

function InterviewItem({ interview, workflow, showCandidate, candidate }: { interview: IRecruitmentInterview; workflow: RecruitmentWorkflow; showCandidate: boolean; candidate?: CandidateRef }) {
    const ref: CandidateRef = interview.candidate
        ? { id: interview.candidate.id, name: interview.candidate.name, jobOfferTitle: interview.candidate.jobOfferTitle }
        : candidate ?? { id: interview.candidatureId, name: "Candidat" }
    const start = new Date(interview.scheduledAt)
    const feedbackDue = interview.status === "SCHEDULED" && new Date(interview.endsAt).getTime() < Date.now()
    const TypeIcon = TYPE_ICONS[interview.type]
    const muted = interview.status === "CANCELLED" || interview.status === "NO_SHOW"

    return (
        <li className={cn("flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-start", feedbackDue ? "border-amber-300" : "border-border")}>
            <div className={cn("flex w-14 shrink-0 flex-col items-center rounded-lg py-1.5", muted ? "bg-muted text-muted-foreground" : "bg-secondary text-primary")}>
                <span className="text-[10px] font-semibold uppercase">{start.toLocaleDateString("fr-FR", { month: "short" })}</span>
                <span className="text-xl font-bold leading-tight tabular-nums">{start.getDate()}</span>
                <span className="text-[10px]">{start.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    {showCandidate ? (
                        <Link href={`/services-rh/recrutements/${ref.id}`} className="font-semibold text-foreground hover:underline">
                            {ref.name}
                        </Link>
                    ) : (
                        <p className="font-semibold text-foreground">Entretien {INTERVIEW_TYPE_META[interview.type].label.toLowerCase()}</p>
                    )}
                    <StatusPill meta={INTERVIEW_STATUS_META[interview.status]} />
                    {feedbackDue && <StatusPill meta={{ label: "Compte rendu à rédiger", className: "bg-amber-100 text-amber-800" }} />}
                    {interview.recommendation && <StatusPill meta={RECOMMENDATION_META[interview.recommendation]} />}
                </div>

                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                        <TypeIcon className="h-3.5 w-3.5" />
                        {INTERVIEW_TYPE_META[interview.type].label}
                    </span>
                    <span className="tabular-nums">{formatTime(interview.scheduledAt)} – {formatTime(interview.endsAt)}</span>
                    {showCandidate && ref.jobOfferTitle && <span>{ref.jobOfferTitle}</span>}
                    {interview.interviewers && <span>Avec {interview.interviewers}</span>}
                </p>

                {interview.meetingUrl && interview.status === "SCHEDULED" && (
                    <a href={interview.meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Rejoindre la visioconférence
                    </a>
                )}
                {interview.location && <p className="mt-1 text-xs text-foreground">{interview.location}</p>}
                {interview.rating !== null && <RatingStars value={interview.rating} className="mt-2" />}
                {interview.feedback && <p className="mt-2 whitespace-pre-line text-sm text-foreground">{interview.feedback}</p>}
                {interview.description && interview.status === "SCHEDULED" && (
                    <p className="mt-2 whitespace-pre-line rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">{interview.description}</p>
                )}
                {interview.outcomeByName && interview.status !== "SCHEDULED" && (
                    <p className="mt-2 text-[11px] text-muted-foreground">Renseigné par {interview.outcomeByName}</p>
                )}
                {interview.status === "SCHEDULED" && !interview.candidateNotifiedAt && (
                    <p className="mt-2 text-[11px] text-muted-foreground">Candidat non convoqué par Goriya.</p>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-start">
                {interview.status === "SCHEDULED" && (
                    <Button size="sm" variant={feedbackDue ? "default" : "outline"} onClick={() => workflow.reportInterview(interview, ref)} className={cn(!feedbackDue && "hover:bg-muted hover:text-foreground")}>
                        <ClipboardCheck className="h-4 w-4" />
                        Compte rendu
                    </Button>
                )}
                {interview.status === "COMPLETED" && (
                    <Button size="sm" variant="outline" onClick={() => workflow.reportInterview(interview, ref)} className="hover:bg-muted hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                        Modifier
                    </Button>
                )}
                {interview.status !== "COMPLETED" && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon-sm" variant="ghost" aria-label="Autres actions sur l'entretien" className="hover:bg-muted hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            {interview.status === "SCHEDULED" && (
                                <>
                                    <DropdownMenuItem onSelect={() => workflow.editInterview(interview, ref)}>
                                        <Pencil className="h-4 w-4" />
                                        Modifier ou déplacer
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => workflow.reportInterview(interview, ref, "NO_SHOW")}>
                                        <UserX className="h-4 w-4" />
                                        Candidat absent
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => workflow.reportInterview(interview, ref, "CANCELLED")}>
                                        <Ban className="h-4 w-4" />
                                        Annuler l&apos;entretien
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            <DropdownMenuItem onSelect={() => workflow.deleteInterview(interview)} className="text-red-600 focus:text-red-600">
                                <Trash2 className="h-4 w-4" />
                                Supprimer
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </li>
    )
}
