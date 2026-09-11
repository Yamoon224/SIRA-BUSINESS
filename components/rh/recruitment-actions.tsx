"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { CallEmbed } from "@/components/call-embed"
import { callSessionService, type ICallJoinToken } from "@/lib/api/call-session.service"
import { CalendarPlus, FolderOpen, MessageSquare, MoreHorizontal, UserCheck, UserPlus, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CandidateMessageDialog } from "@/components/rh/candidate-message-dialog"
import { ConfirmDialog } from "@/components/rh/confirm-dialog"
import { DecisionDialog } from "@/components/rh/decision-dialog"
import { InterviewDialog, type CandidateRef } from "@/components/rh/interview-dialog"
import { InterviewOutcomeDialog } from "@/components/rh/interview-outcome-dialog"
import { CANDIDATE_VISIBLE_STATUS, RECRUITMENT_STAGES, RECRUITMENT_STAGE_META } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import {
    recruitmentService,
    type IRecruitmentCandidate,
    type IRecruitmentInterview,
    type InterviewOutcome,
    type RecruitmentStage,
} from "@/lib/api/recruitment.service"
import { cn } from "@/lib/utils"

export interface RecruitmentWorkflow {
    move: (candidate: IRecruitmentCandidate, stage: RecruitmentStage) => void
    hire: (candidate: IRecruitmentCandidate) => void
    schedule: (candidate: CandidateRef) => void
    editInterview: (interview: IRecruitmentInterview, candidate: CandidateRef) => void
    reportInterview: (interview: IRecruitmentInterview, candidate: CandidateRef, preset?: InterviewOutcome) => void
    deleteInterview: (interview: IRecruitmentInterview) => void
    message: (candidate: IRecruitmentCandidate) => void
    /** Ouvre la salle GORIYA Meet d'un entretien en visio. */
    joinCall: (interview: IRecruitmentInterview, candidate: CandidateRef) => Promise<void>
    /** Entretien dont la salle est en cours d'ouverture. */
    joiningId: string | null
    /** Candidat en cours de déplacement : sa carte affiche un indicateur. */
    busyId: string | null
    dialogs: ReactNode
}

export const candidateRef = (candidate: IRecruitmentCandidate): CandidateRef => ({
    id: candidate.id,
    name: candidate.candidateName,
    jobOfferTitle: candidate.jobOffer?.title ?? null,
})

/**
 * Opérations du pipeline, partagées par la page Recrutements et le dossier d'un
 * candidat : déplacements (avec confirmation quand le candidat voit son statut
 * changer), refus motivé, embauche, entretiens et messages.
 */
export function useRecruitmentWorkflow({ onChanged }: { onChanged: () => Promise<void> | void }): RecruitmentWorkflow {
    const router = useRouter()
    const [busyId, setBusyId] = useState<string | null>(null)
    const [pendingMove, setPendingMove] = useState<{ candidate: IRecruitmentCandidate; stage: RecruitmentStage; hireAfter?: boolean } | null>(null)
    const [rejecting, setRejecting] = useState<IRecruitmentCandidate | null>(null)
    const [saving, setSaving] = useState(false)
    const [interviewFor, setInterviewFor] = useState<{ candidate: CandidateRef; interview: IRecruitmentInterview | null } | null>(null)
    const [outcomeFor, setOutcomeFor] = useState<{ candidate: CandidateRef; interview: IRecruitmentInterview; preset?: InterviewOutcome } | null>(null)
    const [toDelete, setToDelete] = useState<IRecruitmentInterview | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [messageFor, setMessageFor] = useState<IRecruitmentCandidate | null>(null)
    const { data: session } = useSession()
    const [joiningId, setJoiningId] = useState<string | null>(null)
    const [activeCall, setActiveCall] = useState<{ title: string; token: string; url: string; room: string } | null>(null)

    const joinCall = async (interview: IRecruitmentInterview, candidate: CandidateRef) => {
        if (!interview.callSession) return
        setJoiningId(interview.id)
        try {
            const res = await callSessionService.join(interview.callSession.id)
            const body = ((res as { data?: ICallJoinToken })?.data ?? res) as ICallJoinToken
            setActiveCall({ title: `Entretien avec ${candidate.name}`, token: body.token, url: body.url, room: body.room })
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "Impossible d'ouvrir la salle GORIYA Meet."))
        } finally {
            setJoiningId(null)
        }
    }

    const perform = async (candidate: IRecruitmentCandidate, stage: RecruitmentStage, comment: string | null): Promise<boolean> => {
        setBusyId(candidate.id)
        try {
            await recruitmentService.moveStage(candidate.id, stage, comment)
            toast.success(`${candidate.candidateName} → ${RECRUITMENT_STAGE_META[stage].label}.`)
            await onChanged()
            return true
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "Le déplacement du candidat a échoué."))
            return false
        } finally {
            setBusyId(null)
        }
    }

    const hire = (candidate: IRecruitmentCandidate) => {
        if (candidate.employeeId) {
            router.push(`/services-rh/employes/${candidate.employeeId}`)
        } else if (candidate.stage === "OFFER") {
            // La page Employés ouvre la fiche pré-remplie depuis la candidature.
            router.push(`/services-rh/employes?candidature=${candidate.id}`)
        } else {
            setPendingMove({ candidate, stage: "OFFER", hireAfter: true })
        }
    }

    const move = (candidate: IRecruitmentCandidate, stage: RecruitmentStage) => {
        if (stage === candidate.stage) return
        if (candidate.stage === "HIRED") {
            toast.error("Ce candidat a été embauché : sa fiche employé fait désormais foi.")
            return
        }
        if (stage === "HIRED") return hire(candidate)
        if (stage === "REJECTED") return setRejecting(candidate)
        // Le candidat verra son statut changer (et en sera notifié) : on confirme.
        if (CANDIDATE_VISIBLE_STATUS[stage] !== CANDIDATE_VISIBLE_STATUS[candidate.stage]) {
            return setPendingMove({ candidate, stage })
        }
        void perform(candidate, stage, null)
    }

    const confirmMove = async () => {
        if (!pendingMove) return
        setSaving(true)
        const ok = await perform(pendingMove.candidate, pendingMove.stage, null)
        setSaving(false)
        if (!ok) return
        const { candidate, hireAfter } = pendingMove
        setPendingMove(null)
        if (hireAfter) router.push(`/services-rh/employes?candidature=${candidate.id}`)
    }

    const reject = async (comment: string | null) => {
        if (!rejecting) return
        setSaving(true)
        const ok = await perform(rejecting, "REJECTED", comment)
        setSaving(false)
        if (ok) setRejecting(null)
    }

    const removeInterview = async () => {
        if (!toDelete) return
        setDeleting(true)
        try {
            await recruitmentService.removeInterview(toDelete.id)
            toast.success("Entretien supprimé.")
            setToDelete(null)
            await onChanged()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La suppression de l'entretien a échoué."))
        } finally {
            setDeleting(false)
        }
    }

    const refresh = () => void onChanged()

    const dialogs = (
        <>
            <ConfirmDialog
                open={!!pendingMove}
                onOpenChange={(open) => !open && setPendingMove(null)}
                title={
                    pendingMove?.hireAfter
                        ? `Embaucher ${pendingMove.candidate.candidateName} ?`
                        : `Passer ${pendingMove?.candidate.candidateName ?? ""} en « ${pendingMove ? RECRUITMENT_STAGE_META[pendingMove.stage].label : ""} » ?`
                }
                description={
                    pendingMove?.hireAfter
                        ? "Sa candidature passe d'abord à l'étape « Offre » : il la verra « Acceptée » et en sera notifié. La fiche employé s'ouvre ensuite, pré-remplie avec ses informations Goriya."
                        : pendingMove
                            ? `Le candidat verra sa candidature « ${CANDIDATE_VISIBLE_STATUS[pendingMove.stage]} » et recevra une notification.`
                            : undefined
                }
                confirmLabel={pendingMove?.hireAfter ? "Continuer vers la fiche" : "Confirmer"}
                loading={saving}
                onConfirm={confirmMove}
            />

            <DecisionDialog
                open={!!rejecting}
                onOpenChange={(open) => !open && setRejecting(null)}
                title={`Refuser la candidature de ${rejecting?.candidateName ?? ""} ?`}
                description="Le candidat verra sa candidature « Refusée » et en sera notifié ; ses entretiens à venir sont annulés. Le motif reste interne."
                confirmLabel="Refuser la candidature"
                tone="reject"
                commentPlaceholder="Motif du refus (facultatif, visible des recruteurs seulement)"
                loading={saving}
                onConfirm={reject}
            />

            <InterviewDialog
                open={!!interviewFor}
                onOpenChange={(open) => !open && setInterviewFor(null)}
                candidate={interviewFor?.candidate ?? null}
                interview={interviewFor?.interview ?? null}
                onSaved={refresh}
            />

            <InterviewOutcomeDialog
                open={!!outcomeFor}
                onOpenChange={(open) => !open && setOutcomeFor(null)}
                candidate={outcomeFor?.candidate ?? null}
                interview={outcomeFor?.interview ?? null}
                preset={outcomeFor?.preset}
                onSaved={refresh}
            />

            <ConfirmDialog
                open={!!toDelete}
                onOpenChange={(open) => !open && setToDelete(null)}
                title="Supprimer cet entretien ?"
                description="Il disparaît du dossier du candidat. Pour garder une trace, préférez l'annulation. Le candidat n'est pas prévenu."
                confirmLabel="Supprimer"
                destructive
                loading={deleting}
                onConfirm={removeInterview}
            />

            <CandidateMessageDialog
                open={!!messageFor}
                onOpenChange={(open) => !open && setMessageFor(null)}
                candidate={messageFor ? { id: messageFor.id, name: messageFor.candidateName, email: messageFor.candidateEmail } : null}
            />

            {activeCall && (
                <CallEmbed
                    token={activeCall.token}
                    url={activeCall.url}
                    room={activeCall.room}
                    name={session?.user?.name ?? "Recruteur"}
                    title={activeCall.title}
                    onClose={() => {
                        setActiveCall(null)
                        refresh()
                    }}
                />
            )}
        </>
    )

    return {
        move,
        hire,
        schedule: (candidate) => setInterviewFor({ candidate, interview: null }),
        editInterview: (interview, candidate) => setInterviewFor({ candidate, interview }),
        reportInterview: (interview, candidate, preset) => setOutcomeFor({ candidate, interview, preset }),
        deleteInterview: setToDelete,
        message: setMessageFor,
        joinCall,
        joiningId,
        busyId,
        dialogs,
    }
}

/** Menu « … » d'un candidat : dossier, entretien, message, embauche et déplacement. */
export function CandidateActionsMenu({ candidate, workflow, className }: { candidate: IRecruitmentCandidate; workflow: RecruitmentWorkflow; className?: string }) {
    const closed = candidate.stage === "HIRED" || candidate.stage === "REJECTED"

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label={`Actions sur ${candidate.candidateName}`} className={cn("hover:bg-muted hover:text-foreground", className)}>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                    <Link href={`/services-rh/recrutements/${candidate.id}`}>
                        <FolderOpen className="h-4 w-4" />
                        Ouvrir le dossier
                    </Link>
                </DropdownMenuItem>
                {!closed && (
                    <DropdownMenuItem onSelect={() => workflow.schedule(candidateRef(candidate))}>
                        <CalendarPlus className="h-4 w-4" />
                        Planifier un entretien
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => workflow.message(candidate)}>
                    <MessageSquare className="h-4 w-4" />
                    Envoyer un message
                </DropdownMenuItem>
                {candidate.stage === "HIRED" ? (
                    <DropdownMenuItem onSelect={() => workflow.hire(candidate)}>
                        <UserCheck className="h-4 w-4" />
                        Voir la fiche employé
                    </DropdownMenuItem>
                ) : candidate.stage !== "REJECTED" ? (
                    <DropdownMenuItem onSelect={() => workflow.hire(candidate)}>
                        <UserPlus className="h-4 w-4" />
                        Embaucher
                    </DropdownMenuItem>
                ) : null}

                {candidate.stage !== "HIRED" && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Déplacer vers</DropdownMenuLabel>
                        {RECRUITMENT_STAGES.filter((s) => s !== "HIRED" && s !== "REJECTED" && s !== candidate.stage).map((stage) => (
                            <DropdownMenuItem key={stage} onSelect={() => workflow.move(candidate, stage)}>
                                <span className={cn("h-2 w-2 rounded-full", RECRUITMENT_STAGE_META[stage].dot)} />
                                {RECRUITMENT_STAGE_META[stage].label}
                            </DropdownMenuItem>
                        ))}
                        {candidate.stage !== "REJECTED" && (
                            <DropdownMenuItem onSelect={() => workflow.move(candidate, "REJECTED")} className="text-red-600 focus:text-red-600">
                                <XCircle className="h-4 w-4" />
                                Refuser la candidature
                            </DropdownMenuItem>
                        )}
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
