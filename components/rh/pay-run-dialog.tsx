"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatFcfa, todayIso } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { payrollService, type IPayrollRun } from "@/lib/api/payroll.service"

interface PayRunDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    run: IPayrollRun
    onDone: (run: IPayrollRun) => void
}

/** Enregistre le paiement d'une paie validée : date des virements et référence éventuelle. */
export function PayRunDialog({ open, onOpenChange, run, onDone }: PayRunDialogProps) {
    const [date, setDate] = useState("")
    const [reference, setReference] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open) {
            setDate(todayIso())
            setReference("")
            setError(null)
        }
    }, [open])

    const submit = async () => {
        if (!date) return setError("Indiquez la date du paiement.")
        setSaving(true)
        setError(null)
        try {
            const updated = await payrollService.pay(run.id, { paymentDate: date, paymentReference: reference.trim() || null })
            toast.success(`Paie de ${run.label} marquée comme payée.`)
            onDone(updated)
            onOpenChange(false)
        } catch (err) {
            const message = extractApiErrorMessage(err, "L'enregistrement du paiement a échoué.")
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
                    <DialogTitle>Marquer la paie comme payée</DialogTitle>
                    <DialogDescription>
                        {run.employeesCount} salarié{run.employeesCount > 1 ? "s" : ""} · {formatFcfa(run.totals.net)} de net à payer. Une paie
                        payée ne peut plus être rouverte.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-foreground">Date des virements</span>
                        <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setError(null) }} />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-foreground">Référence</span>
                        <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ordre de virement, lot bancaire… (facultatif)" />
                    </label>
                    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button disabled={saving} onClick={() => void submit()} className="bg-green-600 text-white hover:bg-green-700">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Confirmer le paiement
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
