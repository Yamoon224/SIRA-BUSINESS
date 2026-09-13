"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/rh/confirm-dialog"
import { formatDate, formatFcfa } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { payrollService, type IPayrollSettings } from "@/lib/api/payroll.service"

type ContributionDraft = {
    key: string
    code: string
    label: string
    employeeRate: string
    employerRate: string
    ceiling: string
    employeeFixed: string
    employerFixed: string
}
type BracketDraft = { key: string; upTo: string; rate: string }
type Draft = {
    taxLabel: string
    taxableAbatementPercent: string
    deductEmployeeContributions: boolean
    contributions: ContributionDraft[]
    taxBrackets: BracketDraft[]
}

let keySeed = 0
const nextKey = () => `row-${++keySeed}`
const text = (value: number | null | undefined) => (value === null || value === undefined || value === 0 ? "" : String(value))
const parse = (value: string) => (value.trim() === "" ? null : Number(value.replace(",", ".")))

function toDraft(settings: IPayrollSettings): Draft {
    return {
        taxLabel: settings.taxLabel,
        taxableAbatementPercent: text(settings.taxableAbatementPercent),
        deductEmployeeContributions: settings.deductEmployeeContributions,
        contributions: settings.contributions.map((c) => ({
            key: nextKey(),
            code: c.code,
            label: c.label,
            employeeRate: text(c.employeeRate),
            employerRate: text(c.employerRate),
            ceiling: text(c.ceiling),
            employeeFixed: text(c.employeeFixed),
            employerFixed: text(c.employerFixed),
        })),
        taxBrackets: settings.taxBrackets.map((b) => ({ key: nextKey(), upTo: b.upTo === null ? "" : String(b.upTo), rate: String(b.rate) })),
    }
}

/** Mêmes règles que le backend, pour signaler l'erreur avant l'envoi. */
function validateDraft(draft: Draft): string | null {
    if (!draft.taxLabel.trim()) return "Donnez un nom à l'impôt sur salaire."

    const codes = new Set<string>()
    for (const c of draft.contributions) {
        if (!c.code.trim() || !c.label.trim()) return "Chaque cotisation a besoin d'un code et d'un libellé."
        const code = c.code.trim().toUpperCase()
        if (codes.has(code)) return `Le code ${code} est utilisé par deux cotisations.`
        codes.add(code)
        for (const rate of [c.employeeRate, c.employerRate]) {
            const n = parse(rate)
            if (n !== null && (Number.isNaN(n) || n < 0 || n > 100)) return `Taux invalide pour « ${c.label} » : entre 0 et 100 %.`
        }
        for (const amount of [c.ceiling, c.employeeFixed, c.employerFixed]) {
            const n = parse(amount)
            if (n !== null && (!Number.isInteger(n) || n < 0)) return `Montant invalide pour « ${c.label} » : un entier positif, en FCFA.`
        }
    }

    if (draft.taxBrackets.length === 0) return "Le barème doit compter au moins une tranche."
    let previous = 0
    for (let i = 0; i < draft.taxBrackets.length; i++) {
        const bracket = draft.taxBrackets[i]
        const rate = parse(bracket.rate)
        if (rate === null || Number.isNaN(rate) || rate < 0 || rate > 100) return `Taux invalide pour la tranche ${i + 1} : entre 0 et 100 %.`
        if (i === draft.taxBrackets.length - 1) break
        const upTo = parse(bracket.upTo)
        if (upTo === null || !Number.isInteger(upTo) || upTo <= previous) {
            return `Plafond invalide pour la tranche ${i + 1} : il doit dépasser ${formatFcfa(previous)}.`
        }
        previous = upTo
    }

    const abatement = parse(draft.taxableAbatementPercent)
    if (abatement !== null && (Number.isNaN(abatement) || abatement < 0 || abatement > 100)) return "L'abattement doit être compris entre 0 et 100 %."
    return null
}

/**
 * Paramètres de paie : cotisations sociales et barème de l'impôt sur salaire.
 * Les valeurs par défaut sont indicatives - le formulaire le dit en tête, et
 * rappelle qu'un changement ne touche que les paies encore en brouillon.
 */
export function PayrollSettingsForm() {
    const [settings, setSettings] = useState<IPayrollSettings | null>(null)
    const [draft, setDraft] = useState<Draft | null>(null)
    const [dirty, setDirty] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [formError, setFormError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [confirmReset, setConfirmReset] = useState(false)
    const [resetting, setResetting] = useState(false)

    const apply = (next: IPayrollSettings) => {
        setSettings(next)
        setDraft(toDraft(next))
        setDirty(false)
        setFormError(null)
    }

    const load = useCallback(async () => {
        try {
            apply(await payrollService.settings())
            setLoadError(null)
        } catch (err) {
            setLoadError(extractApiErrorMessage(err, "Impossible de charger les paramètres de paie."))
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    const update = (change: (d: Draft) => Draft) => {
        setDraft((prev) => (prev ? change(prev) : prev))
        setDirty(true)
        setFormError(null)
    }

    const setContribution = (key: string, field: keyof Omit<ContributionDraft, "key">, value: string) =>
        update((d) => ({ ...d, contributions: d.contributions.map((c) => (c.key === key ? { ...c, [field]: value } : c)) }))

    const setBracket = (key: string, field: "upTo" | "rate", value: string) =>
        update((d) => ({ ...d, taxBrackets: d.taxBrackets.map((b) => (b.key === key ? { ...b, [field]: value } : b)) }))

    const save = async () => {
        if (!draft) return
        const problem = validateDraft(draft)
        if (problem) {
            setFormError(problem)
            return
        }
        setSaving(true)
        try {
            const last = draft.taxBrackets.length - 1
            const saved = await payrollService.updateSettings({
                taxLabel: draft.taxLabel.trim(),
                taxableAbatementPercent: parse(draft.taxableAbatementPercent) ?? 0,
                deductEmployeeContributions: draft.deductEmployeeContributions,
                contributions: draft.contributions.map((c) => ({
                    code: c.code.trim().toUpperCase(),
                    label: c.label.trim(),
                    employeeRate: parse(c.employeeRate) ?? 0,
                    employerRate: parse(c.employerRate) ?? 0,
                    ceiling: parse(c.ceiling),
                    employeeFixed: parse(c.employeeFixed) ?? 0,
                    employerFixed: parse(c.employerFixed) ?? 0,
                })),
                taxBrackets: draft.taxBrackets.map((b, i) => ({ upTo: i === last ? null : parse(b.upTo), rate: parse(b.rate) ?? 0 })),
            })
            apply(saved)
            toast.success("Paramètres de paie enregistrés.")
        } catch (err) {
            const message = extractApiErrorMessage(err, "L'enregistrement des paramètres a échoué.")
            setFormError(message)
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    const reset = async () => {
        setResetting(true)
        try {
            apply(await payrollService.resetSettings())
            setConfirmReset(false)
            toast.success("Valeurs par défaut rétablies.")
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "Le rétablissement des valeurs par défaut a échoué."))
        } finally {
            setResetting(false)
        }
    }

    if (loadError) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
                <p>{loadError}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>Réessayer</Button>
            </div>
        )
    }
    if (!settings || !draft) {
        return <div className="h-72 animate-pulse rounded-xl bg-muted" aria-busy="true" />
    }

    const numericInput = "h-9 text-right tabular-nums"
    let lowerBound = 0

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                    <p className="font-semibold">
                        {settings.preset === "CI" ? "Valeurs par défaut pour la Côte d'Ivoire, à faire valider" : "Paramètres personnalisés"}
                    </p>
                    <p className="mt-1 text-amber-800">
                        Taux, plafonds et barème évoluent avec les lois de finances et dépendent de votre activité (taux accidents du travail
                        notamment). Faites-les valider par votre comptable avant la première paie. Un changement s&apos;applique aux paies en
                        brouillon au prochain recalcul ; les paies validées ne bougent pas.
                    </p>
                    {settings.updatedAt && <p className="mt-1 text-xs text-amber-700">Dernière modification le {formatDate(settings.updatedAt)}.</p>}
                </div>
            </div>

            <section className="rounded-xl border border-border bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
                    <div>
                        <h2 className="text-sm font-semibold text-foreground">Cotisations sociales</h2>
                        <p className="text-xs text-muted-foreground">Taux en %, plafond et forfaits mensuels en FCFA. Plafond vide : toute la rémunération est soumise.</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-muted hover:text-foreground"
                        onClick={() =>
                            update((d) => ({
                                ...d,
                                contributions: [...d.contributions, { key: nextKey(), code: "", label: "", employeeRate: "", employerRate: "", ceiling: "", employeeFixed: "", employerFixed: "" }],
                            }))
                        }
                    >
                        <Plus className="h-4 w-4" />
                        Ajouter une cotisation
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-sm">
                        <thead>
                            <tr className="bg-muted/40 text-left text-xs text-muted-foreground">
                                <th className="px-3 py-2 font-medium">Code</th>
                                <th className="px-3 py-2 font-medium">Libellé</th>
                                <th className="px-3 py-2 text-right font-medium">Salarié %</th>
                                <th className="px-3 py-2 text-right font-medium">Employeur %</th>
                                <th className="px-3 py-2 text-right font-medium">Plafond</th>
                                <th className="px-3 py-2 text-right font-medium">Forfait salarié</th>
                                <th className="px-3 py-2 text-right font-medium">Forfait employeur</th>
                                <th className="w-10 px-2 py-2"><span className="sr-only">Supprimer</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {draft.contributions.map((c) => (
                                <tr key={c.key} className="border-t border-border">
                                    <td className="px-3 py-2"><Input className="h-9 w-32 uppercase" value={c.code} onChange={(e) => setContribution(c.key, "code", e.target.value)} aria-label="Code" /></td>
                                    <td className="px-3 py-2"><Input className="h-9 min-w-52" value={c.label} onChange={(e) => setContribution(c.key, "label", e.target.value)} aria-label="Libellé" /></td>
                                    <td className="px-3 py-2"><Input inputMode="decimal" className={`${numericInput} w-24`} value={c.employeeRate} onChange={(e) => setContribution(c.key, "employeeRate", e.target.value)} aria-label="Taux salarié" placeholder="0" /></td>
                                    <td className="px-3 py-2"><Input inputMode="decimal" className={`${numericInput} w-24`} value={c.employerRate} onChange={(e) => setContribution(c.key, "employerRate", e.target.value)} aria-label="Taux employeur" placeholder="0" /></td>
                                    <td className="px-3 py-2"><Input inputMode="numeric" className={`${numericInput} w-32`} value={c.ceiling} onChange={(e) => setContribution(c.key, "ceiling", e.target.value)} aria-label="Plafond" placeholder="Aucun" /></td>
                                    <td className="px-3 py-2"><Input inputMode="numeric" className={`${numericInput} w-28`} value={c.employeeFixed} onChange={(e) => setContribution(c.key, "employeeFixed", e.target.value)} aria-label="Forfait salarié" placeholder="0" /></td>
                                    <td className="px-3 py-2"><Input inputMode="numeric" className={`${numericInput} w-28`} value={c.employerFixed} onChange={(e) => setContribution(c.key, "employerFixed", e.target.value)} aria-label="Forfait employeur" placeholder="0" /></td>
                                    <td className="px-2 py-2 text-right">
                                        <Button
                                            size="icon-sm"
                                            variant="ghost"
                                            aria-label={`Retirer ${c.label || "cette cotisation"}`}
                                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                            onClick={() => update((d) => ({ ...d, contributions: d.contributions.filter((x) => x.key !== c.key) }))}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {draft.contributions.length === 0 && (
                                <tr><td colSpan={8} className="px-3 py-6 text-center text-sm text-muted-foreground">Aucune cotisation : les bulletins n&apos;en prélèveront aucune.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="rounded-xl border border-border bg-white p-4">
                <h2 className="text-sm font-semibold text-foreground">Impôt sur salaire</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-foreground">Libellé sur le bulletin</span>
                        <Input value={draft.taxLabel} onChange={(e) => update((d) => ({ ...d, taxLabel: e.target.value }))} placeholder="ITS" />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-foreground">Abattement sur l&apos;imposable (%)</span>
                        <Input inputMode="decimal" className="text-right tabular-nums" value={draft.taxableAbatementPercent} onChange={(e) => update((d) => ({ ...d, taxableAbatementPercent: e.target.value }))} placeholder="0" />
                    </label>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 sm:mt-7 sm:self-start">
                        <span className="text-sm text-foreground">Déduire les cotisations salariales</span>
                        <Switch checked={draft.deductEmployeeContributions} onCheckedChange={(v) => update((d) => ({ ...d, deductEmployeeContributions: v }))} aria-label="Déduire les cotisations salariales de l'imposable" />
                    </div>
                </div>

                <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Barème mensuel par tranches</p>
                <ul className="mt-2 space-y-2">
                    {draft.taxBrackets.map((bracket, i) => {
                        const last = i === draft.taxBrackets.length - 1
                        const from = lowerBound
                        const upTo = parse(bracket.upTo)
                        if (!last && upTo !== null && !Number.isNaN(upTo)) lowerBound = upTo
                        return (
                            <li key={bracket.key} className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="w-44 shrink-0 text-muted-foreground">
                                    {last ? `Au-delà de ${formatFcfa(from)}` : `De ${formatFcfa(from)} à`}
                                </span>
                                {!last && (
                                    <Input inputMode="numeric" className="h-9 w-36 text-right tabular-nums" value={bracket.upTo} onChange={(e) => setBracket(bracket.key, "upTo", e.target.value)} aria-label={`Plafond de la tranche ${i + 1}`} />
                                )}
                                <span className="text-muted-foreground">taxé à</span>
                                <Input inputMode="decimal" className="h-9 w-20 text-right tabular-nums" value={bracket.rate} onChange={(e) => setBracket(bracket.key, "rate", e.target.value)} aria-label={`Taux de la tranche ${i + 1}`} />
                                <span className="text-muted-foreground">%</span>
                                {draft.taxBrackets.length > 1 && (
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        aria-label={`Retirer la tranche ${i + 1}`}
                                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() =>
                                            update((d) => {
                                                const rows = d.taxBrackets.filter((b) => b.key !== bracket.key)
                                                // La nouvelle dernière tranche perd son plafond.
                                                return { ...d, taxBrackets: rows.map((b, idx) => (idx === rows.length - 1 ? { ...b, upTo: "" } : b)) }
                                            })
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </li>
                        )
                    })}
                </ul>
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 hover:bg-muted hover:text-foreground"
                    onClick={() =>
                        update((d) => ({
                            ...d,
                            // La tranche ajoutée s'insère avant la dernière, qui reste sans plafond.
                            taxBrackets: [...d.taxBrackets.slice(0, -1), { key: nextKey(), upTo: "", rate: "" }, ...d.taxBrackets.slice(-1)],
                        }))
                    }
                >
                    <Plus className="h-4 w-4" />
                    Ajouter une tranche
                </Button>
            </section>

            {formError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={() => setConfirmReset(true)} disabled={saving} className="hover:bg-muted hover:text-foreground">
                    <RotateCcw className="h-4 w-4" />
                    Rétablir les valeurs par défaut
                </Button>
                <Button onClick={() => void save()} disabled={saving || !dirty}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Enregistrer les paramètres
                </Button>
            </div>

            <ConfirmDialog
                open={confirmReset}
                onOpenChange={setConfirmReset}
                title="Rétablir les valeurs par défaut ?"
                description="Vos cotisations et votre barème personnalisés seront remplacés par les valeurs indicatives pour la Côte d'Ivoire."
                confirmLabel="Rétablir"
                loading={resetting}
                onConfirm={reset}
            />
        </div>
    )
}
