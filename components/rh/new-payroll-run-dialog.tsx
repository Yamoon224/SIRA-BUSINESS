"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { periodLabel } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { payrollService, type IPayrollRun } from "@/lib/api/payroll.service"

interface NewPayrollRunDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    runs: IPayrollRun[]
    onCreated: (run: IPayrollRun) => void
}

const keyOf = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`

/**
 * Préparation d'une paie. Seules les périodes possibles sont proposées : après
 * la dernière paie existante (elles se traitent dans l'ordre) et au plus tard
 * le mois prochain.
 */
export function NewPayrollRunDialog({ open, onOpenChange, runs, onCreated }: NewPayrollRunDialogProps) {
    const options = useMemo(() => {
        const now = new Date()
        const latest = runs.reduce((max, run) => Math.max(max, run.year * 100 + run.month), 0)
        const list: { year: number; month: number }[] = []
        for (let offset = 1; offset >= -11; offset--) {
            const date = new Date(now.getFullYear(), now.getMonth() + offset, 1)
            const year = date.getFullYear()
            const month = date.getMonth() + 1
            if (year * 100 + month > latest) list.push({ year, month })
        }
        return list
    }, [runs])

    const [value, setValue] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!open) return
        setError(null)
        const now = new Date()
        const current = keyOf(now.getFullYear(), now.getMonth() + 1)
        // Sans paie existante : le mois en cours. Sinon, la période qui suit la dernière.
        const next = runs.length > 0 ? options[options.length - 1] : options.find((o) => keyOf(o.year, o.month) === current)
        setValue(next ? keyOf(next.year, next.month) : options[0] ? keyOf(options[0].year, options[0].month) : "")
    }, [open, options, runs.length])

    const submit = async () => {
        if (!value) return
        const [year, month] = value.split("-").map(Number)
        setSaving(true)
        setError(null)
        try {
            const run = await payrollService.createRun(year, month)
            toast.success(`Paie de ${periodLabel(year, month).toLowerCase()} préparée : ${run.employeesCount} bulletin${run.employeesCount > 1 ? "s" : ""} calculé${run.employeesCount > 1 ? "s" : ""}.`)
            onCreated(run)
            onOpenChange(false)
        } catch (err) {
            const message = extractApiErrorMessage(err, "La préparation de la paie a échoué.")
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
                    <DialogTitle>Préparer une paie</DialogTitle>
                    <DialogDescription>
                        Les bulletins sont calculés à partir des salaires des contrats en vigueur, des entrées et sorties du mois, des congés
                        sans solde et des avances sur salaire approuvés. Vous pourrez ajouter primes et retenues avant de valider.
                    </DialogDescription>
                </DialogHeader>

                {options.length === 0 ? (
                    <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                        Toutes les périodes jusqu&apos;au mois prochain sont déjà préparées.
                    </p>
                ) : (
                    <div>
                        <p className="mb-1.5 text-sm font-medium text-foreground">Période</p>
                        <Select value={value || undefined} onValueChange={setValue}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Choisir un mois" /></SelectTrigger>
                            <SelectContent>
                                {options.map((o) => (
                                    <SelectItem key={keyOf(o.year, o.month)} value={keyOf(o.year, o.month)}>{periodLabel(o.year, o.month)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

                <DialogFooter>
                    <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button disabled={saving || !value} onClick={() => void submit()}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Calculer les bulletins
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
