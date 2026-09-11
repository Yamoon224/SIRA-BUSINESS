"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDate, todayIso } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { contractService, type IEmployeeContract } from "@/lib/api/contract.service"

interface ContractStatusDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    contract: IEmployeeContract | null
    /** ENDED : arrivée à terme. TERMINATED : rupture avant terme. */
    target: "ENDED" | "TERMINATED"
    employeeName: string
    onDone: (contract: IEmployeeContract) => void
}

/**
 * Fin d'un contrat en vigueur. La clôture retient une date de fin (la fin
 * prévue par défaut) ; la rupture exige une date et un motif, et peut marquer
 * l'employé comme parti dans la foulée.
 */
export function ContractStatusDialog({ open, onOpenChange, contract, target, employeeName, onDone }: ContractStatusDialogProps) {
    const [date, setDate] = useState("")
    const [reason, setReason] = useState("")
    const [markDeparted, setMarkDeparted] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open && contract) {
            setDate(target === "ENDED" ? contract.endDate ?? todayIso() : todayIso())
            setReason("")
            setMarkDeparted(true)
            setError(null)
        }
    }, [open, contract, target])

    const terminating = target === "TERMINATED"

    const submit = async () => {
        if (!contract) return
        if (!date) return setError("Indiquez la date.")
        if (date < contract.startDate) return setError(`La date doit suivre le début du contrat (${formatDate(contract.startDate)}).`)
        if (terminating && !reason.trim()) return setError("Indiquez le motif de la rupture.")

        setSaving(true)
        setError(null)
        try {
            const updated = terminating
                ? await contractService.changeStatus(contract.id, {
                      status: "TERMINATED",
                      terminationDate: date,
                      terminationReason: reason.trim(),
                      markEmployeeDeparted: markDeparted,
                  })
                : await contractService.changeStatus(contract.id, { status: "ENDED", endDate: date })
            toast.success(terminating ? `Contrat ${contract.reference} rompu.` : `Contrat ${contract.reference} clôturé.`)
            onDone(updated)
            onOpenChange(false)
        } catch (err) {
            const message = extractApiErrorMessage(err, "Le contrat n'a pas pu être mis à jour.")
            setError(message)
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{terminating ? `Rompre le contrat ${contract?.reference ?? ""}` : `Clôturer le contrat ${contract?.reference ?? ""}`}</DialogTitle>
                    <DialogDescription>
                        {terminating
                            ? `${employeeName} · fin anticipée du contrat. La fiche employé retient la date de rupture comme fin de contrat.`
                            : `${employeeName} · le contrat arrive à son terme et n'est plus en vigueur.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <p className="mb-1.5 text-sm font-medium text-foreground">{terminating ? "Date de rupture" : "Date de fin"}</p>
                        <Input type="date" min={contract?.startDate} value={date} onChange={(e) => { setDate(e.target.value); setError(null) }} />
                    </div>

                    {terminating && (
                        <>
                            <div>
                                <p className="mb-1.5 text-sm font-medium text-foreground">
                                    Motif<span className="ml-0.5 text-destructive">*</span>
                                </p>
                                <Textarea rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setError(null) }} placeholder="Démission, licenciement, rupture conventionnelle, fin de période d'essai…" />
                            </div>
                            <label className="flex items-start gap-2 text-sm text-foreground">
                                <Checkbox checked={markDeparted} onCheckedChange={(v) => setMarkDeparted(v === true)} className="mt-0.5" />
                                <span>
                                    Marquer {employeeName} comme parti
                                    <span className="block text-xs text-muted-foreground">Il ne pourra plus poser de congé ; sa fiche reste consultable.</span>
                                </span>
                            </label>
                        </>
                    )}

                    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button disabled={saving} onClick={() => void submit()} className={terminating ? "bg-red-500 text-white hover:bg-red-600" : undefined}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {terminating ? "Rompre le contrat" : "Clôturer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
