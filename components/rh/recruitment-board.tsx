"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CalendarClock, Loader2, MessageSquareText, Sparkles, Star } from "lucide-react"
import { EmployeeAvatar } from "@/components/rh/employee-avatar"
import { CandidateActionsMenu, type RecruitmentWorkflow } from "@/components/rh/recruitment-actions"
import { RECRUITMENT_STAGES, RECRUITMENT_STAGE_META, formatDateTime, sinceLabel } from "@/lib/data/rh"
import type { IRecruitmentCandidate, RecruitmentStage } from "@/lib/api/recruitment.service"
import { cn } from "@/lib/utils"

interface RecruitmentBoardProps {
    candidates: IRecruitmentCandidate[]
    workflow: RecruitmentWorkflow
}

/** Découpe « Marie Dubois » pour les initiales de l'avatar. */
export function splitName(name: string): { firstName: string; lastName: string } {
    const [firstName = "", ...rest] = name.trim().split(/\s+/)
    return { firstName, lastName: rest.join(" ") }
}

/**
 * Pipeline en colonnes : une carte se glisse d'une étape à l'autre, ou se
 * déplace par son menu (clavier, mobile). Déposer dans « Embauché » lance
 * l'embauche, dans « Refusé » demande le motif.
 */
export function RecruitmentBoard({ candidates, workflow }: RecruitmentBoardProps) {
    const [dragged, setDragged] = useState<IRecruitmentCandidate | null>(null)
    const [overStage, setOverStage] = useState<RecruitmentStage | null>(null)

    const byStage = useMemo(() => {
        const groups = Object.fromEntries(RECRUITMENT_STAGES.map((stage) => [stage, [] as IRecruitmentCandidate[]])) as Record<RecruitmentStage, IRecruitmentCandidate[]>
        for (const candidate of candidates) groups[candidate.stage].push(candidate)
        return groups
    }, [candidates])

    const endDrag = () => {
        setDragged(null)
        setOverStage(null)
    }

    return (
        <div className="-mx-1 overflow-x-auto pb-2">
            <div className="flex min-w-max gap-3 px-1">
                {RECRUITMENT_STAGES.map((stage) => {
                    const items = byStage[stage]
                    const meta = RECRUITMENT_STAGE_META[stage]
                    const canDrop = !!dragged && dragged.stage !== stage
                    return (
                        <section
                            key={stage}
                            aria-label={`${meta.label} : ${items.length} candidat${items.length > 1 ? "s" : ""}`}
                            onDragOver={(e) => {
                                if (!canDrop) return
                                e.preventDefault()
                                e.dataTransfer.dropEffect = "move"
                                if (overStage !== stage) setOverStage(stage)
                            }}
                            onDrop={(e) => {
                                e.preventDefault()
                                if (dragged && canDrop) workflow.move(dragged, stage)
                                endDrag()
                            }}
                            className={cn(
                                "flex w-72 shrink-0 flex-col rounded-xl border transition-colors",
                                overStage === stage && canDrop ? "border-primary bg-secondary/70" : "border-border bg-muted/40",
                            )}
                        >
                            <header className="flex items-center justify-between gap-2 px-3 py-2.5">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
                                    <h3 className="truncate text-sm font-semibold text-foreground">{meta.label}</h3>
                                </div>
                                <span className="rounded-full bg-white px-2 text-xs font-semibold tabular-nums text-muted-foreground">{items.length}</span>
                            </header>

                            <div className="flex max-h-[65vh] min-h-28 flex-col gap-2 overflow-y-auto px-2 pb-2">
                                {items.length === 0 ? (
                                    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                                        {canDrop ? "Déposer ici" : meta.hint}
                                    </p>
                                ) : (
                                    items.map((candidate) => (
                                        <CandidateCard
                                            key={candidate.id}
                                            candidate={candidate}
                                            workflow={workflow}
                                            onDragStart={() => setDragged(candidate)}
                                            onDragEnd={endDrag}
                                        />
                                    ))
                                )}
                            </div>
                        </section>
                    )
                })}
            </div>
        </div>
    )
}

function CandidateCard({
    candidate,
    workflow,
    onDragStart,
    onDragEnd,
}: {
    candidate: IRecruitmentCandidate
    workflow: RecruitmentWorkflow
    onDragStart: () => void
    onDragEnd: () => void
}) {
    const hired = candidate.stage === "HIRED"
    const busy = workflow.busyId === candidate.id
    const { firstName, lastName } = splitName(candidate.candidateName)

    return (
        <article
            draggable={!hired && !busy}
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move"
                e.dataTransfer.setData("text/plain", candidate.id)
                onDragStart()
            }}
            onDragEnd={onDragEnd}
            className={cn(
                "rounded-lg border border-border bg-white p-3 shadow-sm transition-shadow hover:shadow-md",
                !hired && "cursor-grab active:cursor-grabbing",
                busy && "opacity-60",
            )}
        >
            <div className="flex items-start gap-2.5">
                <EmployeeAvatar id={candidate.id} firstName={firstName} lastName={lastName} size="sm" />
                <div className="min-w-0 flex-1">
                    <Link href={`/services-rh/recrutements/${candidate.id}`} className="block truncate text-sm font-semibold text-foreground hover:underline">
                        {candidate.candidateName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{candidate.jobOffer?.title ?? candidate.candidateTitle ?? "-"}</p>
                </div>
                {busy ? (
                    <Loader2 className="m-1.5 h-4 w-4 animate-spin text-primary" aria-label="Déplacement en cours" />
                ) : (
                    <CandidateActionsMenu candidate={candidate} workflow={workflow} className="-mr-1 -mt-1" />
                )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                {candidate.score > 0 && (
                    <span className="rounded-md bg-secondary px-1.5 py-0.5 font-semibold text-primary" title="Compatibilité avec l'offre">
                        {candidate.score} %
                    </span>
                )}
                {candidate.assessmentScore !== null && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-700" title="Évaluation IA">
                        <Sparkles className="h-3 w-3" />
                        {candidate.assessmentScore}
                    </span>
                )}
                {candidate.averageRating !== null && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700" title="Note moyenne des entretiens">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {candidate.averageRating.toLocaleString("fr-FR")}
                    </span>
                )}
                {candidate.notesCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 font-medium text-muted-foreground" title="Notes des recruteurs">
                        <MessageSquareText className="h-3 w-3" />
                        {candidate.notesCount}
                    </span>
                )}
            </div>

            {candidate.nextInterview && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-violet-700">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                    {formatDateTime(candidate.nextInterview.scheduledAt)}
                </p>
            )}
            {candidate.feedbackDueCount > 0 && <p className="mt-2 text-[11px] font-medium text-amber-700">Compte rendu d&apos;entretien à rédiger</p>}
            {candidate.stage === "REJECTED" && candidate.rejectionReason && (
                <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">« {candidate.rejectionReason} »</p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
                {RECRUITMENT_STAGE_META[candidate.stage].label} {sinceLabel(candidate.stageSince)}
            </p>
        </article>
    )
}
