"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Download, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatFcfa, formatRate } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { payrollService, type IPayrollRun, type IPayslip, type PayslipLineSection } from "@/lib/api/payroll.service"
import { cn } from "@/lib/utils"

interface PayslipDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    payslip: IPayslip | null
    run: Pick<IPayrollRun, "year" | "month" | "status" | "label">
    onSaved: (payslip: IPayslip) => void
}

type BonusDraft = { key: string; label: string; amount: string; taxable: boolean; subjectToContributions: boolean }
type DeductionDraft = { key: string; label: string; amount: string }

let keySeed = 0
const nextKey = () => `adj-${++keySeed}`
const amount = (value: number) => new Intl.NumberFormat("fr-FR").format(value)

const SECTIONS: { key: PayslipLineSection; title: string }[] = [
    { key: "EARNING", title: "Rémunération" },
    { key: "CONTRIBUTION", title: "Cotisations sociales" },
    { key: "TAX", title: "Impôt" },
    { key: "DEDUCTION", title: "Retenues" },
]

/**
 * Détail d'un bulletin : rubriques, totaux et, tant que la paie est en
 * brouillon, saisie des primes et retenues. L'enregistrement recalcule le
 * bulletin et la modale reste ouverte sur les nouveaux montants.
 */
export function PayslipDialog({ open, onOpenChange, payslip, run, onSaved }: PayslipDialogProps) {
    const editable = run.status === "DRAFT"
    const [bonuses, setBonuses] = useState<BonusDraft[]>([])
    const [deductions, setDeductions] = useState<DeductionDraft[]>([])
    const [dirty, setDirty] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [downloading, setDownloading] = useState(false)

    useEffect(() => {
        if (!open || !payslip) return
        setBonuses(payslip.bonuses.map((b) => ({ key: nextKey(), label: b.label, amount: String(b.amount), taxable: b.taxable, subjectToContributions: b.subjectToContributions })))
        setDeductions(payslip.deductions.map((d) => ({ key: nextKey(), label: d.label, amount: String(d.amount) })))
        setDirty(false)
        setError(null)
    }, [open, payslip])

    if (!payslip) return null

    const touch = () => {
        setDirty(true)
        setError(null)
    }

    const save = async () => {
        const invalid = [...bonuses, ...deductions].find((row) => !row.label.trim() || !Number.isInteger(Number(row.amount)) || Number(row.amount) <= 0)
        if (invalid) {
            setError("Chaque prime et chaque retenue a besoin d'un libellé et d'un montant entier positif.")
            return
        }
        setSaving(true)
        setError(null)
        try {
            const updated = await payrollService.updatePayslip(payslip.id, {
                bonuses: bonuses.map((b) => ({ label: b.label.trim(), amount: Number(b.amount), taxable: b.taxable, subjectToContributions: b.subjectToContributions })),
                deductions: deductions.map((d) => ({ label: d.label.trim(), amount: Number(d.amount) })),
            })
            toast.success(`Bulletin de ${payslip.employee.fullName} recalculé.`)
            onSaved(updated)
        } catch (err) {
            const message = extractApiErrorMessage(err, "Le recalcul du bulletin a échoué.")
            setError(message)
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    const download = async () => {
        setDownloading(true)
        try {
            await payrollService.downloadPayslip(payslip, run)
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "Le téléchargement du bulletin a échoué."))
        } finally {
            setDownloading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{payslip.employee.fullName}</DialogTitle>
                    <DialogDescription>
                        Bulletin de {run.label} · {payslip.employee.matricule} · {payslip.employee.jobTitle} · {payslip.workedDays} jour
                        {payslip.workedDays > 1 ? "s" : ""} payé{payslip.workedDays > 1 ? "s" : ""} sur {payslip.businessDays}
                    </DialogDescription>
                </DialogHeader>

                {payslip.warnings.length > 0 && (
                    <ul className="space-y-1.5">
                        {payslip.warnings.map((w) => (
                            <li key={w.code} className={cn("flex items-start gap-2 rounded-md px-3 py-2 text-sm", w.blocking ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800")}>
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                {w.message}
                            </li>
                        ))}
                    </ul>
                )}

                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[620px] text-sm">
                        <thead>
                            <tr className="bg-muted/40 text-left text-xs text-muted-foreground">
                                <th className="px-3 py-2 font-medium">Rubrique</th>
                                <th className="px-3 py-2 text-right font-medium">Base</th>
                                <th className="px-3 py-2 text-right font-medium">Taux</th>
                                <th className="px-3 py-2 text-right font-medium">Salarié</th>
                                <th className="px-3 py-2 text-right font-medium">Employeur</th>
                            </tr>
                        </thead>
                        {SECTIONS.map((section) => {
                            const lines = payslip.lines.filter((l) => l.section === section.key)
                            if (lines.length === 0) return null
                            return (
                                <tbody key={section.key}>
                                    <tr className="border-t border-border bg-muted/20">
                                        <th colSpan={5} className="px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</th>
                                    </tr>
                                    {lines.map((line, i) => {
                                        const withheld = section.key !== "EARNING"
                                        const value = withheld ? -line.employeeAmount : line.employeeAmount
                                        const rates =
                                            section.key === "TAX"
                                                ? "Barème"
                                                : [line.employeeRate, line.employerRate].some((r) => r !== null)
                                                    ? [line.employeeRate, line.employerRate].map((r) => (r === null ? "-" : formatRate(r))).join(" / ")
                                                    : ""
                                        return (
                                            <tr key={`${line.code}-${i}`} className="border-t border-border">
                                                <td className="px-3 py-2 text-foreground">{line.label}</td>
                                                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{line.base !== null ? amount(line.base) : ""}</td>
                                                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{rates}</td>
                                                <td className={cn("px-3 py-2 text-right tabular-nums", value < 0 ? "text-red-600" : "text-foreground")}>
                                                    {value === 0 ? "" : `${value > 0 ? "+" : "−"}${amount(Math.abs(value))}`}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{line.employerAmount ? amount(line.employerAmount) : ""}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            )
                        })}
                    </table>
                </div>

                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Total label="Salaire brut" value={payslip.gross} />
                    <Total label="Cotisations et impôt" value={payslip.employeeContributions + payslip.tax} />
                    <Total label="Net à payer" value={payslip.net} strong />
                    <Total label="Coût employeur" value={payslip.employerCost} />
                </dl>

                {editable && (
                    <div className="space-y-4 rounded-lg border border-border p-3">
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">Primes et indemnités</p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="hover:bg-muted hover:text-foreground"
                                    onClick={() => { setBonuses((rows) => [...rows, { key: nextKey(), label: "", amount: "", taxable: true, subjectToContributions: true }]); touch() }}
                                >
                                    <Plus className="h-4 w-4" />
                                    Prime
                                </Button>
                            </div>
                            {bonuses.length === 0 ? (
                                <p className="mt-1 text-xs text-muted-foreground">Aucune prime ce mois-ci.</p>
                            ) : (
                                <ul className="mt-2 space-y-2">
                                    {bonuses.map((b) => (
                                        <li key={b.key} className="flex flex-col gap-2 rounded-md bg-muted/40 p-2 sm:flex-row sm:items-center">
                                            <Input className="h-9 flex-1 bg-white" value={b.label} placeholder="Prime de transport, 13e mois…" aria-label="Libellé de la prime"
                                                onChange={(e) => { const v = e.target.value; setBonuses((rows) => rows.map((r) => (r.key === b.key ? { ...r, label: v } : r))); touch() }} />
                                            <Input className="h-9 bg-white text-right tabular-nums sm:w-32" inputMode="numeric" value={b.amount} placeholder="Montant" aria-label="Montant de la prime"
                                                onChange={(e) => { const v = e.target.value; setBonuses((rows) => rows.map((r) => (r.key === b.key ? { ...r, amount: v } : r))); touch() }} />
                                            <label className="flex items-center gap-1.5 text-xs text-foreground">
                                                <Checkbox checked={b.taxable} onCheckedChange={(v) => { setBonuses((rows) => rows.map((r) => (r.key === b.key ? { ...r, taxable: v === true } : r))); touch() }} />
                                                Imposable
                                            </label>
                                            <label className="flex items-center gap-1.5 text-xs text-foreground">
                                                <Checkbox checked={b.subjectToContributions} onCheckedChange={(v) => { setBonuses((rows) => rows.map((r) => (r.key === b.key ? { ...r, subjectToContributions: v === true } : r))); touch() }} />
                                                Cotisable
                                            </label>
                                            <Button size="icon-sm" variant="ghost" aria-label="Retirer la prime" className="self-end text-red-600 hover:bg-red-50 hover:text-red-700 sm:self-auto"
                                                onClick={() => { setBonuses((rows) => rows.filter((r) => r.key !== b.key)); touch() }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">Autres retenues</p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="hover:bg-muted hover:text-foreground"
                                    onClick={() => { setDeductions((rows) => [...rows, { key: nextKey(), label: "", amount: "" }]); touch() }}
                                >
                                    <Plus className="h-4 w-4" />
                                    Retenue
                                </Button>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Les avances sur salaire approuvées sont retenues automatiquement ; ne les saisissez pas ici.
                            </p>
                            {deductions.length > 0 && (
                                <ul className="mt-2 space-y-2">
                                    {deductions.map((d) => (
                                        <li key={d.key} className="flex flex-col gap-2 rounded-md bg-muted/40 p-2 sm:flex-row sm:items-center">
                                            <Input className="h-9 flex-1 bg-white" value={d.label} placeholder="Prêt, cotisation mutuelle…" aria-label="Libellé de la retenue"
                                                onChange={(e) => { const v = e.target.value; setDeductions((rows) => rows.map((r) => (r.key === d.key ? { ...r, label: v } : r))); touch() }} />
                                            <Input className="h-9 bg-white text-right tabular-nums sm:w-32" inputMode="numeric" value={d.amount} placeholder="Montant" aria-label="Montant de la retenue"
                                                onChange={(e) => { const v = e.target.value; setDeductions((rows) => rows.map((r) => (r.key === d.key ? { ...r, amount: v } : r))); touch() }} />
                                            <Button size="icon-sm" variant="ghost" aria-label="Retirer la retenue" className="self-end text-red-600 hover:bg-red-50 hover:text-red-700 sm:self-auto"
                                                onClick={() => { setDeductions((rows) => rows.filter((r) => r.key !== d.key)); touch() }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                    </div>
                )}

                <DialogFooter className="gap-2 sm:justify-between">
                    <Button variant="outline" disabled={downloading} onClick={() => void download()} className="hover:bg-muted hover:text-foreground">
                        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Bulletin .docx
                    </Button>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Fermer</Button>
                        {editable && (
                            <Button disabled={saving || !dirty} onClick={() => void save()}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Enregistrer et recalculer
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function Total({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
    return (
        <div className={cn("rounded-lg border p-3", strong ? "border-primary/30 bg-secondary/60" : "border-border")}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={cn("mt-1 font-semibold tabular-nums", strong ? "text-lg text-primary" : "text-foreground")}>{formatFcfa(value)}</dd>
        </div>
    )
}
