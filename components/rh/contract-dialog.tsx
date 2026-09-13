"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CONTRACT_TYPES, FIXED_TERM_CONTRACT_TYPES, addDaysIso, formatDate, todayIso } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { contractService, type IEmployeeContract } from "@/lib/api/contract.service"
import type { ContractType, IEmployee } from "@/lib/api/employee.service"
import { cn } from "@/lib/utils"

/**
 * Ce que la modale établit : un contrat initial (éventuellement pré-rempli
 * depuis la fiche, dates d'embauche comprises quand l'employé n'a encore aucun
 * contrat), ou un renouvellement / avenant d'un contrat existant.
 */
export type ContractDialogMode =
    | { kind: "INITIAL"; fromHireDate?: boolean }
    | { kind: "RENEWAL" | "AMENDMENT"; parent: IEmployeeContract }

type FormState = {
    employeeId: string
    type: ContractType | ""
    jobTitle: string
    startDate: string
    endDate: string
    trialEndDate: string
    salary: string
    weeklyHours: string
    signedAt: string
    notes: string
    activate: boolean
}

type Errors = Partial<Record<keyof FormState, string>>

const INITIAL_MODE: ContractDialogMode = { kind: "INITIAL" }

const blank = (): FormState => ({
    employeeId: "",
    type: "",
    jobTitle: "",
    startDate: todayIso(),
    endDate: "",
    trialEndDate: "",
    salary: "",
    weeklyHours: "40",
    signedAt: "",
    notes: "",
    activate: true,
})

const numberField = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value))

function fromEmployee(employee: IEmployee, fromHireDate: boolean): FormState {
    return {
        ...blank(),
        employeeId: employee.id,
        type: employee.contractType,
        jobTitle: employee.jobTitle,
        startDate: fromHireDate ? employee.hireDate : todayIso(),
        endDate: fromHireDate ? employee.contractEndDate ?? "" : "",
        salary: numberField(employee.salary),
    }
}

function fromContract(contract: IEmployeeContract): FormState {
    return {
        employeeId: contract.employeeId,
        type: contract.type,
        jobTitle: contract.jobTitle,
        startDate: contract.startDate,
        endDate: contract.endDate ?? "",
        trialEndDate: contract.trialEndDate ?? "",
        salary: numberField(contract.salary),
        weeklyHours: numberField(contract.weeklyHours),
        signedAt: contract.signedAt ?? "",
        notes: contract.notes ?? "",
        activate: contract.status !== "DRAFT",
    }
}

/**
 * Renouvellement : mêmes conditions, débute le lendemain de la fin prévue.
 * Avenant : mêmes conditions et même échéance, prend effet aujourd'hui.
 */
function fromParent(mode: Extract<ContractDialogMode, { parent: IEmployeeContract }>): FormState {
    const parent = mode.parent
    const base: FormState = {
        ...blank(),
        employeeId: parent.employeeId,
        type: parent.type,
        jobTitle: parent.jobTitle,
        salary: numberField(parent.salary),
        weeklyHours: numberField(parent.weeklyHours) || "40",
    }
    return mode.kind === "RENEWAL"
        ? { ...base, startDate: parent.endDate ? addDaysIso(parent.endDate, 1) : todayIso(), endDate: "" }
        : { ...base, startDate: todayIso(), endDate: parent.endDate ?? "" }
}

function validate(f: FormState): Errors {
    const e: Errors = {}
    if (!f.employeeId) e.employeeId = "Choisissez l'employé."
    if (!f.type) e.type = "Choisissez le type de contrat."
    if (!f.jobTitle.trim()) e.jobTitle = "L'intitulé du poste est obligatoire."
    if (!f.startDate) e.startDate = "La date de début est obligatoire."
    if (f.type && FIXED_TERM_CONTRACT_TYPES.includes(f.type) && !f.endDate) e.endDate = "Obligatoire pour ce type de contrat."
    if (f.endDate && f.startDate && f.endDate < f.startDate) e.endDate = "Doit suivre la date de début."
    if (f.trialEndDate && f.startDate && f.trialEndDate < f.startDate) e.trialEndDate = "Doit suivre le début du contrat."
    if (f.trialEndDate && f.endDate && f.trialEndDate > f.endDate) e.trialEndDate = "Ne peut pas dépasser la fin du contrat."
    if (f.salary !== "" && Number(f.salary) < 0) e.salary = "Le salaire ne peut pas être négatif."
    if (f.weeklyHours !== "") {
        const hours = Number(f.weeklyHours)
        if (!Number.isInteger(hours) || hours < 1 || hours > 60) e.weeklyHours = "Entre 1 et 60 heures."
    }
    return e
}

interface ContractDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Contrat à modifier ; absent pour une création. */
    contract?: IEmployeeContract | null
    mode?: ContractDialogMode
    /** Employé imposé (fiche détail, ou employé présélectionné). */
    employee?: IEmployee | null
    /** Employés proposés quand l'employé n'est pas imposé (page Contrats). */
    employees?: IEmployee[]
    /** Référence du contrat en vigueur d'un employé, pour annoncer ce qu'une mise en vigueur remplace. */
    activeReferenceOf?: (employeeId: string) => string | null
    onSaved: (contract: IEmployeeContract) => void
}

/**
 * Établissement et modification d'un contrat.
 *
 * Un brouillon se modifie librement. Un contrat mis en vigueur ne se réécrit
 * plus : seules sa date de signature et ses notes restent ouvertes, le reste se
 * change par un avenant - la modale le dit et verrouille les champs.
 */
export function ContractDialog({ open, onOpenChange, contract, mode, employee, employees = [], activeReferenceOf, onSaved }: ContractDialogProps) {
    const effectiveMode = mode ?? INITIAL_MODE
    const isEdit = !!contract
    const locked = isEdit && contract.status !== "DRAFT"
    const pickEmployee = !isEdit && effectiveMode.kind === "INITIAL" && !employee

    const [form, setForm] = useState<FormState>(blank)
    const [errors, setErrors] = useState<Errors>({})
    const [serverError, setServerError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!open) return
        setErrors({})
        setServerError(null)
        if (contract) setForm(fromContract(contract))
        else if (effectiveMode.kind !== "INITIAL") setForm(fromParent(effectiveMode))
        else setForm(employee ? fromEmployee(employee, !!effectiveMode.fromHireDate) : blank())
    }, [open, contract, effectiveMode, employee])

    const selectable = useMemo(
        () => employees.filter((e) => e.status !== "TERMINATED").sort((a, b) => a.lastName.localeCompare(b.lastName, "fr")),
        [employees],
    )

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }))
        setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    }

    /** Choix de l'employé : reprend son poste, son type de contrat et son salaire actuels. */
    const chooseEmployee = (id: string) => {
        const chosen = selectable.find((e) => e.id === id)
        setForm((prev) => (chosen ? { ...fromEmployee(chosen, false), activate: prev.activate, notes: prev.notes } : { ...prev, employeeId: id }))
        setErrors((prev) => ({ ...prev, employeeId: undefined }))
    }

    const employeeName =
        employee?.fullName ??
        contract?.employee?.fullName ??
        (effectiveMode.kind !== "INITIAL" ? effectiveMode.parent.employee?.fullName : undefined) ??
        selectable.find((e) => e.id === form.employeeId)?.fullName

    const replaced = form.employeeId ? activeReferenceOf?.(form.employeeId) ?? null : null

    const submit = async () => {
        const found = locked ? {} : validate(form)
        setErrors(found)
        if (Object.keys(found).length > 0) {
            setServerError("Corrigez les champs signalés avant d'enregistrer.")
            return
        }

        const terms = {
            type: form.type as ContractType,
            jobTitle: form.jobTitle.trim(),
            startDate: form.startDate,
            endDate: form.endDate || null,
            trialEndDate: form.trialEndDate || null,
            salary: form.salary === "" ? null : Number(form.salary),
            weeklyHours: form.weeklyHours === "" ? null : Number(form.weeklyHours),
            signedAt: form.signedAt || null,
            notes: form.notes.trim() || null,
        }

        setSaving(true)
        setServerError(null)
        try {
            let saved: IEmployeeContract
            if (contract) {
                saved = await contractService.update(contract.id, locked ? { signedAt: terms.signedAt, notes: terms.notes } : terms)
                toast.success(`Contrat ${saved.reference} mis à jour.`)
            } else {
                saved = await contractService.create(form.employeeId, {
                    ...terms,
                    kind: effectiveMode.kind,
                    parentId: effectiveMode.kind === "INITIAL" ? null : effectiveMode.parent.id,
                    status: form.activate ? "ACTIVE" : "DRAFT",
                })
                toast.success(form.activate ? `Contrat ${saved.reference} mis en vigueur.` : `Contrat ${saved.reference} enregistré en brouillon.`)
            }
            onSaved(saved)
            onOpenChange(false)
        } catch (err) {
            const message = extractApiErrorMessage(err, "L'enregistrement du contrat a échoué.")
            setServerError(message)
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    const title = contract
        ? `Contrat ${contract.reference}`
        : effectiveMode.kind === "RENEWAL"
            ? `Renouveler ${effectiveMode.parent.reference}`
            : effectiveMode.kind === "AMENDMENT"
                ? `Avenant à ${effectiveMode.parent.reference}`
                : "Nouveau contrat"

    const description = locked
        ? "Contrat mis en vigueur : seules la date de signature et les notes se modifient. Pour changer ses conditions, établissez un avenant."
        : [employeeName, contract ? "Brouillon : tous les champs restent modifiables." : "Les champs marqués d'un astérisque sont obligatoires."]
              .filter(Boolean)
              .join(" · ")

    const fixedTerm = !!form.type && FIXED_TERM_CONTRACT_TYPES.includes(form.type)

    return (
        <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {serverError && (
                        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {pickEmployee && (
                            <Field label="Employé" required error={errors.employeeId} className="sm:col-span-2">
                                <Select value={form.employeeId || undefined} onValueChange={chooseEmployee}>
                                    <SelectTrigger className="w-full" aria-invalid={!!errors.employeeId}>
                                        <SelectValue placeholder={selectable.length ? "Choisir un employé" : "Aucun employé présent"} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72">
                                        {selectable.map((e) => (
                                            <SelectItem key={e.id} value={e.id}>
                                                {e.fullName} <span className="text-muted-foreground">· {e.jobTitle}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        )}

                        <Field label="Type de contrat" required error={errors.type}>
                            <Select value={form.type || undefined} onValueChange={(v) => set("type", v as ContractType)} disabled={locked}>
                                <SelectTrigger className="w-full" aria-invalid={!!errors.type}><SelectValue placeholder="Choisir" /></SelectTrigger>
                                <SelectContent>
                                    {CONTRACT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Intitulé du poste" required error={errors.jobTitle}>
                            <Input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} disabled={locked} aria-invalid={!!errors.jobTitle} placeholder="Comptable" />
                        </Field>

                        <Field label="Début" required error={errors.startDate}>
                            <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} disabled={locked} aria-invalid={!!errors.startDate} />
                        </Field>
                        <Field label="Fin" required={fixedTerm} hint={fixedTerm ? undefined : "Vide : durée indéterminée"} error={errors.endDate}>
                            <Input type="date" min={form.startDate || undefined} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} disabled={locked} aria-invalid={!!errors.endDate} />
                        </Field>

                        <Field label="Fin de période d'essai" hint="Facultatif" error={errors.trialEndDate}>
                            <Input type="date" min={form.startDate || undefined} max={form.endDate || undefined} value={form.trialEndDate} onChange={(e) => set("trialEndDate", e.target.value)} disabled={locked} aria-invalid={!!errors.trialEndDate} />
                        </Field>
                        <Field label="Signé le" hint="Vide tant qu'il n'est pas signé">
                            <Input type="date" max={todayIso()} value={form.signedAt} onChange={(e) => set("signedAt", e.target.value)} />
                        </Field>

                        <Field label="Salaire brut mensuel (FCFA)" error={errors.salary}>
                            <Input type="number" inputMode="numeric" min={0} value={form.salary} onChange={(e) => set("salary", e.target.value)} disabled={locked} aria-invalid={!!errors.salary} placeholder="450000" />
                        </Field>
                        <Field label="Durée hebdomadaire (heures)" error={errors.weeklyHours}>
                            <Input type="number" inputMode="numeric" min={1} max={60} value={form.weeklyHours} onChange={(e) => set("weeklyHours", e.target.value)} disabled={locked} aria-invalid={!!errors.weeklyHours} />
                        </Field>
                    </div>

                    <Field label="Notes">
                        <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Clauses particulières, lieu de conservation de l'original…" />
                    </Field>

                    {!isEdit && (
                        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                            <div>
                                <p className="text-sm font-medium text-foreground">Mettre en vigueur dès l&apos;enregistrement</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {form.activate
                                        ? replaced
                                            ? `Remplace ${replaced}, clôturé la veille du ${formatDate(form.startDate)}. La fiche employé reprend ce type de contrat, cette échéance et ce salaire.`
                                            : "Devient le contrat en vigueur : la fiche employé reprend ce type de contrat, cette échéance et ce salaire."
                                        : "Enregistré en brouillon, modifiable librement : vous le mettrez en vigueur une fois signé."}
                                </p>
                            </div>
                            <Switch checked={form.activate} onCheckedChange={(v) => set("activate", v)} aria-label="Mettre en vigueur" />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button disabled={saving} onClick={() => void submit()}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isEdit ? "Enregistrer" : form.activate ? "Mettre en vigueur" : "Enregistrer le brouillon"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function Field({
    label,
    required,
    hint,
    error,
    className,
    children,
}: {
    label: string
    required?: boolean
    hint?: string
    error?: string
    className?: string
    children: ReactNode
}) {
    return (
        <div className={cn("min-w-0", className)}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                    {label}
                    {required && <span className="ml-0.5 text-destructive">*</span>}
                </span>
                {hint && !error && <span className="text-[11px] text-muted-foreground">{hint}</span>}
            </div>
            {children}
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
    )
}
