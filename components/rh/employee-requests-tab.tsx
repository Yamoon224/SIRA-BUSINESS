"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Check, ClipboardList, FilePlus2, Loader2, MoreHorizontal, PlayCircle, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/rh/confirm-dialog"
import { DecisionDialog } from "@/components/rh/decision-dialog"
import { HrRequestDialog } from "@/components/rh/hr-request-dialog"
import { StatusPill } from "@/components/rh/status-pill"
import { HR_REQUEST_TYPE_META, WORKFLOW_STATUS_META, formatDate, formatFcfa } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { employeeService, type HrWorkflowStatus, type IEmployee, type IHrRequest } from "@/lib/api/employee.service"

interface EmployeeRequestsTabProps {
    employee: IEmployee
    requests: IHrRequest[]
    loading: boolean
    onChanged: () => Promise<void> | void
}

const DECISION_COPY: Partial<Record<HrWorkflowStatus, { title: string; confirm: string; tone: "approve" | "reject" | "neutral"; done: string }>> = {
    APPROVED: { title: "Approuver cette demande ?", confirm: "Approuver", tone: "approve", done: "Demande approuvée." },
    REJECTED: { title: "Refuser cette demande ?", confirm: "Refuser", tone: "reject", done: "Demande refusée." },
    CANCELLED: { title: "Annuler cette demande ?", confirm: "Annuler la demande", tone: "neutral", done: "Demande annulée." },
}

/** Onglet « Demandes » : attestations, avances, formations… et leur traitement. */
export function EmployeeRequestsTab({ employee, requests, loading, onChanged }: EmployeeRequestsTabProps) {
    const [createOpen, setCreateOpen] = useState(false)
    const [decision, setDecision] = useState<{ request: IHrRequest; status: HrWorkflowStatus } | null>(null)
    const [deciding, setDeciding] = useState(false)
    const [startingId, setStartingId] = useState<string | null>(null)
    const [toDelete, setToDelete] = useState<IHrRequest | null>(null)
    const [deleting, setDeleting] = useState(false)

    /** « Prendre en charge » n'est pas une décision : pas de modale, un clic suffit. */
    const start = async (request: IHrRequest) => {
        setStartingId(request.id)
        try {
            await employeeService.decideRequest(request.id, "IN_PROGRESS")
            toast.success("Demande prise en charge.")
            await onChanged()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La prise en charge a échoué."))
        } finally {
            setStartingId(null)
        }
    }

    const decide = async (comment: string | null) => {
        if (!decision) return
        setDeciding(true)
        try {
            await employeeService.decideRequest(decision.request.id, decision.status, comment)
            toast.success(DECISION_COPY[decision.status]?.done ?? "Demande mise à jour.")
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
            await employeeService.removeRequest(toDelete.id)
            toast.success("Demande supprimée.")
            setToDelete(null)
            await onChanged()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La suppression de la demande a échoué."))
        } finally {
            setDeleting(false)
        }
    }

    const copy = decision ? DECISION_COPY[decision.status] : undefined

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">Demandes RH</h2>
                <Button onClick={() => setCreateOpen(true)}>
                    <FilePlus2 className="h-4 w-4" />
                    Nouvelle demande
                </Button>
            </div>

            {loading ? (
                <div className="space-y-2" aria-busy="true">
                    {[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
                </div>
            ) : requests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center">
                    <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                        Aucune demande pour {employee.firstName}. Attestations, avances sur salaire, formations : tout se suit ici.
                    </p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {requests.map((request) => {
                        const open = request.status === "PENDING" || request.status === "IN_PROGRESS"
                        return (
                            <li key={request.id} className="rounded-xl border border-border bg-white p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-foreground">{request.subject}</p>
                                            <StatusPill meta={WORKFLOW_STATUS_META[request.status]} />
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {HR_REQUEST_TYPE_META[request.type]?.label ?? request.type} · reçue le {formatDate(request.createdAt)}
                                            {request.amount !== null ? ` · ${formatFcfa(request.amount)}` : ""}
                                        </p>
                                        {request.description && <p className="mt-2 whitespace-pre-line text-sm text-foreground">{request.description}</p>}
                                        {request.type === "SALARY_ADVANCE" && request.status === "APPROVED" && (
                                            <p className={`mt-2 text-xs font-medium ${request.payslipId ? "text-green-700" : "text-amber-700"}`}>
                                                {request.payslipId ? "Retenue sur un bulletin de paie validé." : "Sera retenue sur la prochaine paie validée."}
                                            </p>
                                        )}
                                        {request.decidedAt && (
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                {WORKFLOW_STATUS_META[request.status].label} le {formatDate(request.decidedAt)}
                                                {request.decidedByName ? ` par ${request.decidedByName}` : ""}
                                                {request.decisionComment ? ` — « ${request.decisionComment} »` : ""}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                                        {request.status === "PENDING" && (
                                            <Button size="sm" variant="outline" disabled={startingId === request.id} onClick={() => void start(request)} className="hover:bg-muted hover:text-foreground">
                                                {startingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                                                Prendre en charge
                                            </Button>
                                        )}
                                        {open && (
                                            <>
                                                <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => setDecision({ request, status: "APPROVED" })}>
                                                    <Check className="h-4 w-4" />
                                                    Approuver
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDecision({ request, status: "REJECTED" })}>
                                                    <X className="h-4 w-4" />
                                                    Refuser
                                                </Button>
                                            </>
                                        )}
                                        {request.status !== "APPROVED" && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="icon-sm" variant="ghost" aria-label="Autres actions" className="hover:bg-muted hover:text-foreground">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {open && (
                                                        <DropdownMenuItem onSelect={() => setDecision({ request, status: "CANCELLED" })}>
                                                            <X className="h-4 w-4" />
                                                            Annuler la demande
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onSelect={() => setToDelete(request)} className="text-red-600 focus:text-red-600">
                                                        <Trash2 className="h-4 w-4" />
                                                        Supprimer
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}

            <HrRequestDialog open={createOpen} onOpenChange={setCreateOpen} employee={employee} onCreated={() => void onChanged()} />

            <DecisionDialog
                open={!!decision}
                onOpenChange={(open) => !open && setDecision(null)}
                title={copy?.title ?? ""}
                description={decision ? `${decision.request.subject} · ${HR_REQUEST_TYPE_META[decision.request.type]?.label}` : undefined}
                confirmLabel={copy?.confirm ?? "Confirmer"}
                tone={copy?.tone}
                commentRequired={decision?.status === "REJECTED"}
                loading={deciding}
                onConfirm={decide}
            />

            <ConfirmDialog
                open={!!toDelete}
                onOpenChange={(open) => !open && setToDelete(null)}
                title="Supprimer cette demande ?"
                description="Elle disparaîtra de l'historique de l'employé. Cette action est définitive."
                confirmLabel="Supprimer"
                destructive
                loading={deleting}
                onConfirm={remove}
            />
        </div>
    )
}
