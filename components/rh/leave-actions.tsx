"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Check, MoreHorizontal, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/rh/confirm-dialog"
import { DecisionDialog } from "@/components/rh/decision-dialog"
import { LEAVE_TYPE_META, formatDate } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { employeeService, type HrWorkflowStatus, type IEmployeeLeave } from "@/lib/api/employee.service"

type Decision = { leave: IEmployeeLeave; status: HrWorkflowStatus }

const DECISION_COPY: Partial<Record<HrWorkflowStatus, { title: string; confirm: string; tone: "approve" | "reject" | "neutral"; done: string }>> = {
    APPROVED: { title: "Approuver ce congé ?", confirm: "Approuver", tone: "approve", done: "Congé approuvé." },
    REJECTED: { title: "Refuser ce congé ?", confirm: "Refuser", tone: "reject", done: "Congé refusé." },
    CANCELLED: { title: "Annuler ce congé ?", confirm: "Annuler le congé", tone: "neutral", done: "Congé annulé." },
}

/**
 * Décisions et suppression d'un congé, partagées par la fiche employé et la
 * page Congés : mêmes modales, mêmes messages, mêmes règles. `dialogs` est à
 * placer une fois dans le rendu de l'écran appelant.
 *
 * `onBulkDeleted` (page Congés uniquement) vide la sélection de la page une
 * fois la suppression par lot confirmée.
 */
export function useLeaveWorkflow(onChanged: () => Promise<void> | void, onBulkDeleted?: () => void) {
    const [decision, setDecision] = useState<Decision | null>(null)
    const [deciding, setDeciding] = useState(false)
    const [toDelete, setToDelete] = useState<IEmployeeLeave | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [bulkIds, setBulkIds] = useState<string[] | null>(null)
    const [bulkDeleting, setBulkDeleting] = useState(false)

    const decide = async (comment: string | null) => {
        if (!decision) return
        setDeciding(true)
        try {
            await employeeService.decideLeave(decision.leave.id, decision.status, comment)
            toast.success(DECISION_COPY[decision.status]?.done ?? "Congé mis à jour.")
            setDecision(null)
            await onChanged()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La décision n'a pas pu être enregistrée."))
        } finally {
            setDeciding(false)
        }
    }

    const remove = async () => {
        if (!toDelete) return
        setDeleting(true)
        try {
            await employeeService.removeLeave(toDelete.id)
            toast.success("Congé supprimé.")
            setToDelete(null)
            await onChanged()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La suppression du congé a échoué."))
        } finally {
            setDeleting(false)
        }
    }

    const removeBulk = async () => {
        if (!bulkIds || bulkIds.length === 0) return
        setBulkDeleting(true)
        try {
            const { deleted } = await employeeService.removeLeaves(bulkIds)
            toast.success(deleted > 1 ? `${deleted} congés supprimés.` : "Congé supprimé.")
            setBulkIds(null)
            onBulkDeleted?.()
            await onChanged()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La suppression a échoué."))
        } finally {
            setBulkDeleting(false)
        }
    }

    const copy = decision ? DECISION_COPY[decision.status] : undefined
    const who = decision?.leave.employee?.fullName

    const dialogs = (
        <>
            <DecisionDialog
                open={!!decision}
                onOpenChange={(open) => !open && setDecision(null)}
                title={copy?.title ?? ""}
                description={
                    decision
                        ? `${who ? `${who} · ` : ""}${LEAVE_TYPE_META[decision.leave.type]?.label} du ${formatDate(decision.leave.startDate)} au ${formatDate(decision.leave.endDate)} (${decision.leave.days} j).`
                        : undefined
                }
                confirmLabel={copy?.confirm ?? "Confirmer"}
                tone={copy?.tone}
                commentRequired={decision?.status === "REJECTED"}
                loading={deciding}
                onConfirm={decide}
            />
            <ConfirmDialog
                open={!!toDelete}
                onOpenChange={(open) => !open && setToDelete(null)}
                title="Supprimer ce congé ?"
                description="Il disparaîtra de l'historique de l'employé. Cette action est définitive."
                confirmLabel="Supprimer"
                destructive
                loading={deleting}
                onConfirm={remove}
            />
            <ConfirmDialog
                open={!!bulkIds}
                onOpenChange={(open) => !open && setBulkIds(null)}
                title={`Supprimer ${bulkIds?.length ?? 0} congé${(bulkIds?.length ?? 0) > 1 ? "s" : ""} ?`}
                description="Ils disparaîtront de l'historique des employés concernés. Cette action est définitive."
                confirmLabel="Supprimer"
                destructive
                loading={bulkDeleting}
                onConfirm={removeBulk}
            />
        </>
    )

    return {
        requestDecision: (leave: IEmployeeLeave, status: HrWorkflowStatus) => setDecision({ leave, status }),
        requestDelete: (leave: IEmployeeLeave) => setToDelete(leave),
        requestBulkDelete: (ids: string[]) => setBulkIds(ids),
        dialogs,
    }
}

interface LeaveActionButtonsProps {
    leave: IEmployeeLeave
    onDecide: (leave: IEmployeeLeave, status: HrWorkflowStatus) => void
    onDelete: (leave: IEmployeeLeave) => void
    /** Boutons icône seuls, pour les lignes de tableau. */
    compact?: boolean
}

/**
 * Actions possibles selon le statut : un congé en attente s'approuve, se
 * refuse ou s'annule. Une fois approuvé, il est définitif - on ne l'annule
 * plus, on le supprime si besoin (retour anticipé, erreur d'approbation).
 */
export function LeaveActionButtons({ leave, onDecide, onDelete, compact = false }: LeaveActionButtonsProps) {
    const size = compact ? "icon-sm" : "sm"

    return (
        <div className="flex shrink-0 items-center justify-end gap-1.5">
            {leave.status === "PENDING" && (
                <>
                    <Button
                        size={size}
                        className="bg-green-600 text-white hover:bg-green-700"
                        aria-label="Approuver"
                        title={compact ? "Approuver" : undefined}
                        onClick={() => onDecide(leave, "APPROVED")}
                    >
                        <Check className="h-4 w-4" />
                        {!compact && "Approuver"}
                    </Button>
                    <Button
                        size={size}
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        aria-label="Refuser"
                        title={compact ? "Refuser" : undefined}
                        onClick={() => onDecide(leave, "REJECTED")}
                    >
                        <X className="h-4 w-4" />
                        {!compact && "Refuser"}
                    </Button>
                </>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="icon-sm" variant="ghost" aria-label="Autres actions" className="hover:bg-muted hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {leave.status === "PENDING" && (
                        <DropdownMenuItem onSelect={() => onDecide(leave, "CANCELLED")}>
                            <X className="h-4 w-4" />
                            Annuler la demande
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => onDelete(leave)} className="text-red-600 focus:text-red-600">
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
