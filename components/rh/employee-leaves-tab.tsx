"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CalendarDays, CalendarPlus, Check, MoreHorizontal, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/rh/confirm-dialog"
import { DecisionDialog } from "@/components/rh/decision-dialog"
import { LeaveDialog } from "@/components/rh/leave-dialog"
import { StatusPill } from "@/components/rh/status-pill"
import { LEAVE_TYPE_META, WORKFLOW_STATUS_META, formatDate } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { employeeService, type HrWorkflowStatus, type IEmployee, type IEmployeeLeave } from "@/lib/api/employee.service"

interface EmployeeLeavesTabProps {
    employee: IEmployee
    leaves: IEmployeeLeave[]
    loading: boolean
    onChanged: () => Promise<void> | void
}

const DECISION_COPY: Partial<Record<HrWorkflowStatus, { title: string; confirm: string; tone: "approve" | "reject" | "neutral"; done: string }>> = {
    APPROVED: { title: "Approuver ce congé ?", confirm: "Approuver", tone: "approve", done: "Congé approuvé." },
    REJECTED: { title: "Refuser ce congé ?", confirm: "Refuser", tone: "reject", done: "Congé refusé." },
    CANCELLED: { title: "Annuler ce congé ?", confirm: "Annuler le congé", tone: "neutral", done: "Congé annulé." },
}

/** Onglet « Congés » : solde de l'année, pose d'un congé et décisions. */
export function EmployeeLeavesTab({ employee, leaves, loading, onChanged }: EmployeeLeavesTabProps) {
    const [createOpen, setCreateOpen] = useState(false)
    const [decision, setDecision] = useState<{ leave: IEmployeeLeave; status: HrWorkflowStatus } | null>(null)
    const [deciding, setDeciding] = useState(false)
    const [toDelete, setToDelete] = useState<IEmployeeLeave | null>(null)
    const [deleting, setDeleting] = useState(false)

    const balance = employee.leaveBalance
    const departed = employee.status === "TERMINATED"

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

    const takenPct = balance && balance.entitlement > 0 ? Math.min(100, (balance.taken / balance.entitlement) * 100) : 0
    const pendingPct = balance && balance.entitlement > 0 ? Math.min(100 - takenPct, (balance.pending / balance.entitlement) * 100) : 0
    const copy = decision ? DECISION_COPY[decision.status] : undefined

    return (
        <div className="space-y-4">
            {balance && (
                <section className="rounded-xl border border-border bg-white p-4 sm:p-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">Congés payés {balance.year}</h2>
                            <p className="text-xs text-muted-foreground">Droit annuel de {balance.entitlement} jours ouvrés</p>
                        </div>
                        <p className="text-2xl font-semibold tabular-nums text-foreground">
                            {balance.remaining}
                            <span className="ml-1 text-sm font-normal text-muted-foreground">jour{Math.abs(balance.remaining) > 1 ? "s" : ""} restant{Math.abs(balance.remaining) > 1 ? "s" : ""}</span>
                        </p>
                    </div>
                    <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${balance.taken} jours pris et ${balance.pending} en attente sur ${balance.entitlement}`}>
                        <div className="bg-brand-gradient" style={{ width: `${takenPct}%` }} />
                        <div className="bg-amber-300" style={{ width: `${pendingPct}%` }} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />{balance.taken} pris</span>
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-300" />{balance.pending} en attente</span>
                    </div>
                </section>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">Congés et absences</h2>
                <Button onClick={() => setCreateOpen(true)} disabled={departed} title={departed ? "L'employé a quitté l'entreprise" : undefined}>
                    <CalendarPlus className="h-4 w-4" />
                    Poser un congé
                </Button>
            </div>

            {loading ? (
                <div className="space-y-2" aria-busy="true">
                    {[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
                </div>
            ) : leaves.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center">
                    <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Aucun congé enregistré pour {employee.firstName}.</p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {leaves.map((leave) => (
                        <li key={leave.id} className="rounded-xl border border-border bg-white p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-foreground">{LEAVE_TYPE_META[leave.type]?.label ?? leave.type}</p>
                                        <StatusPill meta={WORKFLOW_STATUS_META[leave.status]} />
                                    </div>
                                    <p className="mt-1 text-sm text-foreground">
                                        Du {formatDate(leave.startDate)} au {formatDate(leave.endDate)}
                                        <span className="text-muted-foreground"> · {leave.days} jour{leave.days > 1 ? "s" : ""} ouvré{leave.days > 1 ? "s" : ""}</span>
                                    </p>
                                    {leave.reason && <p className="mt-1 text-sm text-muted-foreground">{leave.reason}</p>}
                                    {leave.decidedAt && (
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {WORKFLOW_STATUS_META[leave.status].label} le {formatDate(leave.decidedAt)}
                                            {leave.decidedByName ? ` par ${leave.decidedByName}` : ""}
                                            {leave.decisionComment ? ` — « ${leave.decisionComment} »` : ""}
                                        </p>
                                    )}
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    {leave.status === "PENDING" && (
                                        <>
                                            <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => setDecision({ leave, status: "APPROVED" })}>
                                                <Check className="h-4 w-4" />
                                                Approuver
                                            </Button>
                                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDecision({ leave, status: "REJECTED" })}>
                                                <X className="h-4 w-4" />
                                                Refuser
                                            </Button>
                                        </>
                                    )}
                                    {leave.status === "APPROVED" && (
                                        <Button size="sm" variant="outline" className="hover:bg-muted hover:text-foreground" onClick={() => setDecision({ leave, status: "CANCELLED" })}>
                                            Annuler
                                        </Button>
                                    )}
                                    {leave.status !== "APPROVED" && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon-sm" variant="ghost" aria-label="Autres actions" className="hover:bg-muted hover:text-foreground">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {leave.status === "PENDING" && (
                                                    <DropdownMenuItem onSelect={() => setDecision({ leave, status: "CANCELLED" })}>
                                                        <X className="h-4 w-4" />
                                                        Annuler la demande
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onSelect={() => setToDelete(leave)} className="text-red-600 focus:text-red-600">
                                                    <Trash2 className="h-4 w-4" />
                                                    Supprimer
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <LeaveDialog open={createOpen} onOpenChange={setCreateOpen} employee={employee} onCreated={() => void onChanged()} />

            <DecisionDialog
                open={!!decision}
                onOpenChange={(open) => !open && setDecision(null)}
                title={copy?.title ?? ""}
                description={
                    decision
                        ? `${LEAVE_TYPE_META[decision.leave.type]?.label} du ${formatDate(decision.leave.startDate)} au ${formatDate(decision.leave.endDate)} (${decision.leave.days} j).`
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
        </div>
    )
}
