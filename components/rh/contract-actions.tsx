"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { toast } from "sonner"
import {
    Ban,
    CalendarCheck,
    CheckCircle2,
    Download,
    FilePen,
    FileText,
    FileX,
    Loader2,
    MoreHorizontal,
    Pencil,
    RefreshCw,
    Trash2,
    Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/rh/confirm-dialog"
import { ContractDialog, type ContractDialogMode } from "@/components/rh/contract-dialog"
import { ContractStatusDialog } from "@/components/rh/contract-status-dialog"
import { FIXED_TERM_CONTRACT_TYPES, formatDate } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { contractService, type IEmployeeContract } from "@/lib/api/contract.service"
import type { IEmployee } from "@/lib/api/employee.service"

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
const INITIAL: ContractDialogMode = { kind: "INITIAL" }

interface ContractWorkflowOptions {
    onChanged: () => Promise<void> | void
    /** Employé imposé (fiche détail). */
    employee?: IEmployee | null
    /** Répertoire (page Contrats) : choix de l'employé et pré-remplissage. */
    employees?: IEmployee[]
    /** Contrats connus, pour annoncer celui qu'une mise en vigueur remplace. */
    contracts?: IEmployeeContract[]
}

type DialogState = { open: boolean; contract: IEmployeeContract | null; mode: ContractDialogMode; employeeId: string | null }

/**
 * Toutes les opérations sur un contrat, partagées par la fiche employé et la
 * page Contrats : établir, renouveler, amender, mettre en vigueur, clôturer,
 * rompre, joindre ou retirer le document signé, générer le projet. `dialogs`
 * est à placer une fois dans le rendu de l'écran appelant.
 */
export function useContractWorkflow({ onChanged, employee, employees, contracts }: ContractWorkflowOptions) {
    const [dialog, setDialog] = useState<DialogState>({ open: false, contract: null, mode: INITIAL, employeeId: null })
    const [statusChange, setStatusChange] = useState<{ contract: IEmployeeContract; target: "ENDED" | "TERMINATED" } | null>(null)
    const [toActivate, setToActivate] = useState<IEmployeeContract | null>(null)
    const [activating, setActivating] = useState(false)
    const [toDelete, setToDelete] = useState<IEmployeeContract | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [documentToRemove, setDocumentToRemove] = useState<IEmployeeContract | null>(null)
    const [removingDocument, setRemovingDocument] = useState(false)
    const [busyId, setBusyId] = useState<string | null>(null)
    const fileInput = useRef<HTMLInputElement>(null)
    const uploadTarget = useRef<IEmployeeContract | null>(null)

    const findEmployee = (id: string | null | undefined): IEmployee | null => {
        if (!id) return null
        if (employee?.id === id) return employee
        return employees?.find((e) => e.id === id) ?? null
    }

    const nameOf = (contract: IEmployeeContract) => findEmployee(contract.employeeId)?.fullName ?? contract.employee?.fullName ?? "l'employé"

    const activeReferenceOf = (employeeId: string): string | null =>
        contracts?.find((c) => c.employeeId === employeeId && c.status === "ACTIVE")?.reference ??
        (employee?.id === employeeId ? employee.activeContract?.reference ?? null : null)

    const openCreate = (options: { employeeId?: string | null; mode?: ContractDialogMode } = {}) =>
        setDialog({ open: true, contract: null, mode: options.mode ?? INITIAL, employeeId: options.employeeId ?? null })

    const withBusy = async (contract: IEmployeeContract, action: () => Promise<void>) => {
        setBusyId(contract.id)
        try {
            await action()
        } finally {
            setBusyId(null)
        }
    }

    const onFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ""
        const target = uploadTarget.current
        if (!file || !target) return
        if (file.size > MAX_DOCUMENT_BYTES) {
            toast.error("Le document dépasse 10 Mo.")
            return
        }
        await withBusy(target, async () => {
            try {
                await contractService.uploadDocument(target.id, file)
                toast.success(`Contrat signé joint à ${target.reference}.`)
                await onChanged()
            } catch (err) {
                toast.error(extractApiErrorMessage(err, "L'envoi du document a échoué."))
            }
        })
    }

    const activate = async () => {
        if (!toActivate) return
        setActivating(true)
        try {
            await contractService.changeStatus(toActivate.id, { status: "ACTIVE" })
            toast.success(`Contrat ${toActivate.reference} mis en vigueur.`)
            setToActivate(null)
            await onChanged()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La mise en vigueur a échoué."))
        } finally {
            setActivating(false)
        }
    }

    const remove = async () => {
        if (!toDelete) return
        setDeleting(true)
        try {
            await contractService.remove(toDelete.id)
            toast.success(`Brouillon ${toDelete.reference} supprimé.`)
            setToDelete(null)
            await onChanged()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La suppression du brouillon a échoué."))
        } finally {
            setDeleting(false)
        }
    }

    const removeDocument = async () => {
        if (!documentToRemove) return
        setRemovingDocument(true)
        try {
            await contractService.removeDocument(documentToRemove.id)
            toast.success("Document retiré.")
            setDocumentToRemove(null)
            await onChanged()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "Le document n'a pas pu être retiré."))
        } finally {
            setRemovingDocument(false)
        }
    }

    const dialogEmployeeId =
        dialog.contract?.employeeId ?? (dialog.mode.kind !== "INITIAL" ? dialog.mode.parent.employeeId : dialog.employeeId ?? employee?.id)
    const replacedByActivation = toActivate ? activeReferenceOf(toActivate.employeeId) : null

    const dialogs = (
        <>
            <input
                ref={fileInput}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="hidden"
                onChange={(e) => void onFileSelected(e)}
            />

            <ContractDialog
                open={dialog.open}
                onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
                contract={dialog.contract}
                mode={dialog.mode}
                employee={findEmployee(dialogEmployeeId)}
                employees={employees}
                activeReferenceOf={activeReferenceOf}
                onSaved={() => void onChanged()}
            />

            <ContractStatusDialog
                open={!!statusChange}
                onOpenChange={(open) => !open && setStatusChange(null)}
                contract={statusChange?.contract ?? null}
                target={statusChange?.target ?? "ENDED"}
                employeeName={statusChange ? nameOf(statusChange.contract) : ""}
                onDone={() => void onChanged()}
            />

            <ConfirmDialog
                open={!!toActivate}
                onOpenChange={(open) => !open && setToActivate(null)}
                title={`Mettre en vigueur ${toActivate?.reference ?? ""} ?`}
                description={
                    toActivate
                        ? `${replacedByActivation && replacedByActivation !== toActivate.reference ? `Il remplace ${replacedByActivation}, clôturé la veille du ${formatDate(toActivate.startDate)}. ` : ""}La fiche de ${nameOf(toActivate)} reprend son type de contrat, son échéance et son salaire.`
                        : undefined
                }
                confirmLabel="Mettre en vigueur"
                loading={activating}
                onConfirm={activate}
            />

            <ConfirmDialog
                open={!!toDelete}
                onOpenChange={(open) => !open && setToDelete(null)}
                title={`Supprimer le brouillon ${toDelete?.reference ?? ""} ?`}
                description="Ce brouillon n'a jamais été mis en vigueur : il disparaît définitivement."
                confirmLabel="Supprimer"
                destructive
                loading={deleting}
                onConfirm={remove}
            />

            <ConfirmDialog
                open={!!documentToRemove}
                onOpenChange={(open) => !open && setDocumentToRemove(null)}
                title="Retirer le contrat signé ?"
                description={`Le fichier « ${documentToRemove?.document?.name ?? ""} » sera supprimé. La date de signature est conservée.`}
                confirmLabel="Retirer"
                destructive
                loading={removingDocument}
                onConfirm={removeDocument}
            />
        </>
    )

    return {
        busyId,
        dialogs,
        openCreate,
        openEdit: (contract: IEmployeeContract) => setDialog({ open: true, contract, mode: INITIAL, employeeId: contract.employeeId }),
        renew: (contract: IEmployeeContract) => openCreate({ mode: { kind: "RENEWAL", parent: contract } }),
        amend: (contract: IEmployeeContract) => openCreate({ mode: { kind: "AMENDMENT", parent: contract } }),
        requestActivate: setToActivate,
        requestEnd: (contract: IEmployeeContract) => setStatusChange({ contract, target: "ENDED" }),
        requestTerminate: (contract: IEmployeeContract) => setStatusChange({ contract, target: "TERMINATED" }),
        requestDelete: setToDelete,
        requestRemoveDocument: setDocumentToRemove,
        requestUpload: (contract: IEmployeeContract) => {
            uploadTarget.current = contract
            fileInput.current?.click()
        },
        download: (contract: IEmployeeContract) =>
            withBusy(contract, async () => {
                try {
                    await contractService.downloadDocument(contract)
                } catch (err) {
                    toast.error(extractApiErrorMessage(err, "Le téléchargement du document a échoué."))
                }
            }),
        downloadDraft: (contract: IEmployeeContract) =>
            withBusy(contract, async () => {
                try {
                    await contractService.downloadDraft(contract)
                } catch (err) {
                    toast.error(extractApiErrorMessage(err, "La génération du projet de contrat a échoué."))
                }
            }),
    }
}

export type ContractWorkflow = ReturnType<typeof useContractWorkflow>

/** Menu des actions possibles sur un contrat, selon son statut. */
export function ContractActionsMenu({ contract, workflow }: { contract: IEmployeeContract; workflow: ContractWorkflow }) {
    const busy = workflow.busyId === contract.id
    const canRenew = contract.status === "ACTIVE" || (contract.status === "ENDED" && FIXED_TERM_CONTRACT_TYPES.includes(contract.type))

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" disabled={busy} aria-label={`Actions sur le contrat ${contract.reference}`} className="hover:bg-muted hover:text-foreground">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onSelect={() => workflow.openEdit(contract)}>
                    <Pencil className="h-4 w-4" />
                    {contract.status === "DRAFT" ? "Modifier le brouillon" : "Signature et notes"}
                </DropdownMenuItem>
                {contract.status === "DRAFT" && (
                    <DropdownMenuItem onSelect={() => workflow.requestActivate(contract)}>
                        <CheckCircle2 className="h-4 w-4" />
                        Mettre en vigueur
                    </DropdownMenuItem>
                )}
                {canRenew && (
                    <DropdownMenuItem onSelect={() => workflow.renew(contract)}>
                        <RefreshCw className="h-4 w-4" />
                        Renouveler
                    </DropdownMenuItem>
                )}
                {contract.status === "ACTIVE" && (
                    <DropdownMenuItem onSelect={() => workflow.amend(contract)}>
                        <FilePen className="h-4 w-4" />
                        Établir un avenant
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                {contract.document ? (
                    <>
                        <DropdownMenuItem onSelect={() => void workflow.download(contract)}>
                            <Download className="h-4 w-4" />
                            Télécharger le contrat signé
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => workflow.requestUpload(contract)}>
                            <Upload className="h-4 w-4" />
                            Remplacer le document
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => workflow.requestRemoveDocument(contract)} className="text-red-600 focus:text-red-600">
                            <FileX className="h-4 w-4" />
                            Retirer le document
                        </DropdownMenuItem>
                    </>
                ) : (
                    <DropdownMenuItem onSelect={() => workflow.requestUpload(contract)}>
                        <Upload className="h-4 w-4" />
                        Joindre le contrat signé
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => void workflow.downloadDraft(contract)}>
                    <FileText className="h-4 w-4" />
                    Générer le projet (.docx)
                </DropdownMenuItem>

                {contract.status === "ACTIVE" && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => workflow.requestEnd(contract)}>
                            <CalendarCheck className="h-4 w-4" />
                            Clôturer à échéance
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => workflow.requestTerminate(contract)} className="text-red-600 focus:text-red-600">
                            <Ban className="h-4 w-4" />
                            Rompre le contrat
                        </DropdownMenuItem>
                    </>
                )}
                {contract.status === "DRAFT" && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => workflow.requestDelete(contract)} className="text-red-600 focus:text-red-600">
                            <Trash2 className="h-4 w-4" />
                            Supprimer le brouillon
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
