"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LEAVE_TYPE_META, businessDays, todayIso } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { employeeService, type IEmployee, type IEmployeeLeave, type LeaveType } from "@/lib/api/employee.service"

interface LeaveDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    employee: IEmployee
    onCreated: (leave: IEmployeeLeave) => void
}

/**
 * Pose d'un congé pour un employé. La durée en jours ouvrés s'affiche pendant
 * la saisie (même calcul que le backend) et, pour des congés payés, le solde
 * restant : dépasser le solde n'empêche pas l'enregistrement, mais l'approbation
 * sera refusée — autant le dire avant.
 */
export function LeaveDialog({ open, onOpenChange, employee, onCreated }: LeaveDialogProps) {
    const [type, setType] = useState<LeaveType>("PAID")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [reason, setReason] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open) {
            setType("PAID")
            setStartDate(todayIso())
            setEndDate(todayIso())
            setReason("")
            setError(null)
        }
    }, [open])

    const days = businessDays(startDate, endDate)
    const balance = employee.leaveBalance
    const countsAgainstBalance = LEAVE_TYPE_META[type].countsAgainstBalance
    const exceedsBalance = countsAgainstBalance && !!balance && days > balance.remaining - balance.pending

    const submit = async () => {
        if (!startDate || !endDate) return setError("Indiquez les dates de début et de fin.")
        if (endDate < startDate) return setError("La date de fin doit suivre la date de début.")
        if (days === 0) return setError("La période choisie ne contient aucun jour ouvré.")

        setSaving(true)
        setError(null)
        try {
            const leave = await employeeService.createLeave(employee.id, { type, startDate, endDate, reason: reason.trim() || null })
            toast.success(`Congé enregistré : ${days} jour${days > 1 ? "s" : ""} ouvré${days > 1 ? "s" : ""}, en attente de validation.`)
            onCreated(leave)
            onOpenChange(false)
        } catch (err) {
            const message = extractApiErrorMessage(err, "L'enregistrement du congé a échoué.")
            setError(message)
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Poser un congé</DialogTitle>
                    <DialogDescription>{employee.fullName} · le congé sera enregistré en attente de validation.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <p className="mb-1.5 text-sm font-medium text-foreground">Type d&apos;absence</p>
                        <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {(Object.keys(LEAVE_TYPE_META) as LeaveType[]).map((t) => (
                                    <SelectItem key={t} value={t}>{LEAVE_TYPE_META[t].label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <p className="mb-1.5 text-sm font-medium text-foreground">Du</p>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value)
                                    if (endDate && e.target.value > endDate) setEndDate(e.target.value)
                                    setError(null)
                                }}
                            />
                        </div>
                        <div>
                            <p className="mb-1.5 text-sm font-medium text-foreground">Au (inclus)</p>
                            <Input type="date" min={startDate || undefined} value={endDate} onChange={(e) => { setEndDate(e.target.value); setError(null) }} />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Durée</span>
                        <span className="font-semibold text-foreground">
                            {days} jour{days > 1 ? "s" : ""} ouvré{days > 1 ? "s" : ""}
                        </span>
                    </div>

                    {countsAgainstBalance && balance && (
                        <p className={`flex items-start gap-2 text-xs ${exceedsBalance ? "text-amber-700" : "text-muted-foreground"}`}>
                            {exceedsBalance && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                            Solde {balance.year} : {balance.remaining} jour{balance.remaining > 1 ? "s" : ""} restant{balance.remaining > 1 ? "s" : ""}
                            {balance.pending > 0 ? `, dont ${balance.pending} déjà en attente` : ""}.
                            {exceedsBalance ? " Ce congé dépasse le solde disponible : il ne pourra pas être approuvé en l'état." : ""}
                        </p>
                    )}

                    <div>
                        <p className="mb-1.5 text-sm font-medium text-foreground">Motif</p>
                        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Facultatif" />
                    </div>

                    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button disabled={saving} onClick={() => void submit()}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Enregistrer le congé
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
