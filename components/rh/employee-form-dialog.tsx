"use client"

import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react"
import { toast } from "sonner"
import { ArrowLeft, Loader2, PenLine, Search, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AutocompleteInput } from "@/components/autocomplete-input"
import { PhoneInput, telephoneValide } from "@/components/phone-input"
import { LOCALISATIONS } from "@/lib/data/afrique"
import { CONTRACT_TYPES, DEPARTMENTS, EMPLOYEE_STATUS_META, formatDate, todayIso } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import {
    employeeService,
    type ContractType,
    type EmployeePayload,
    type EmployeeStatus,
    type IEmployee,
    type IHireableCandidature,
} from "@/lib/api/employee.service"
import { cn } from "@/lib/utils"

/** Valeur « aucun » des Select Radix, qui refusent la chaîne vide. */
const NONE = "__none__"
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FormState = {
    matricule: string
    firstName: string
    lastName: string
    gender: "" | "M" | "F"
    birthDate: string
    email: string
    phone: string
    address: string
    jobTitle: string
    department: string
    managerId: string
    contractType: ContractType | ""
    hireDate: string
    contractEndDate: string
    salary: string
    annualLeaveDays: string
    status: EmployeeStatus
    emergencyContactName: string
    emergencyContactPhone: string
    notes: string
}

type Errors = Partial<Record<keyof FormState, string>>

const emptyForm = (): FormState => ({
    matricule: "",
    firstName: "",
    lastName: "",
    gender: "",
    birthDate: "",
    email: "",
    phone: "",
    address: "",
    jobTitle: "",
    department: "",
    managerId: NONE,
    contractType: "",
    hireDate: todayIso(),
    contractEndDate: "",
    salary: "",
    annualLeaveDays: "26",
    status: "ACTIVE",
    emergencyContactName: "",
    emergencyContactPhone: "",
    notes: "",
})

const fromEmployee = (e: IEmployee): FormState => ({
    matricule: e.matricule ?? "",
    firstName: e.firstName ?? "",
    lastName: e.lastName ?? "",
    gender: e.gender ?? "",
    birthDate: e.birthDate ?? "",
    email: e.email ?? "",
    phone: e.phone ?? "",
    address: e.address ?? "",
    jobTitle: e.jobTitle ?? "",
    department: e.department ?? "",
    managerId: e.manager?.id ?? NONE,
    contractType: e.contractType ?? "",
    hireDate: e.hireDate ?? "",
    contractEndDate: e.contractEndDate ?? "",
    salary: e.salary !== null && e.salary !== undefined ? String(e.salary) : "",
    annualLeaveDays: String(e.annualLeaveDays ?? 26),
    status: e.status,
    emergencyContactName: e.emergencyContactName ?? "",
    emergencyContactPhone: e.emergencyContactPhone ?? "",
    notes: e.notes ?? "",
})

/** Mêmes règles que SaveEmployeeRequest côté backend, pour signaler avant l'envoi. */
function validate(f: FormState): Errors {
    const e: Errors = {}
    if (!f.firstName.trim()) e.firstName = "Le prénom est obligatoire."
    if (!f.lastName.trim()) e.lastName = "Le nom est obligatoire."
    if (!f.jobTitle.trim()) e.jobTitle = "L'intitulé du poste est obligatoire."
    if (!f.contractType) e.contractType = "Choisissez un type de contrat."
    if (!f.hireDate) e.hireDate = "La date d'embauche est obligatoire."
    if (f.contractType === "CDD" && !f.contractEndDate) e.contractEndDate = "Obligatoire pour un CDD."
    if (f.contractEndDate && f.hireDate && f.contractEndDate < f.hireDate) {
        e.contractEndDate = "Doit suivre la date d'embauche."
    }
    if (f.birthDate && f.birthDate >= todayIso()) e.birthDate = "La date de naissance doit être passée."
    if (f.email.trim() && !EMAIL_PATTERN.test(f.email.trim())) e.email = "Adresse e-mail invalide."
    if (f.phone && !telephoneValide(f.phone)) e.phone = "Numéro incomplet."
    if (f.emergencyContactPhone && !telephoneValide(f.emergencyContactPhone)) e.emergencyContactPhone = "Numéro incomplet."
    if (f.salary !== "" && Number(f.salary) < 0) e.salary = "Le salaire ne peut pas être négatif."
    if (f.annualLeaveDays !== "") {
        const days = Number(f.annualLeaveDays)
        if (!Number.isInteger(days) || days < 0 || days > 60) e.annualLeaveDays = "Entre 0 et 60 jours."
    }
    return e
}

function toPayload(f: FormState): EmployeePayload {
    const text = (v: string) => v.trim() || null
    return {
        matricule: text(f.matricule),
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        gender: f.gender || null,
        birthDate: f.birthDate || null,
        email: text(f.email),
        phone: f.phone || null,
        address: text(f.address),
        jobTitle: f.jobTitle.trim(),
        department: text(f.department),
        managerId: f.managerId === NONE ? null : f.managerId,
        contractType: f.contractType,
        hireDate: f.hireDate,
        contractEndDate: f.contractEndDate || null,
        salary: f.salary === "" ? null : Number(f.salary),
        annualLeaveDays: f.annualLeaveDays === "" ? null : Number(f.annualLeaveDays),
        status: f.status,
        emergencyContactName: text(f.emergencyContactName),
        emergencyContactPhone: f.emergencyContactPhone || null,
        notes: text(f.notes),
    }
}

const normalise = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

type Step = "origin" | "candidature" | "form"

interface EmployeeFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Fiche à modifier ; absente pour un ajout. */
    employee?: IEmployee | null
    /** Ajout ouvert depuis la page Candidatures : la candidature à embaucher. */
    candidatureId?: string | null
    /** Employés existants, pour proposer un responsable. */
    employees: IEmployee[]
    onSaved: (employee: IEmployee) => void
}

/**
 * Ajout et modification d'un employé.
 *
 * Un ajout commence par l'origine du collaborateur : soit une candidature
 * acceptée — la fiche est alors pré-remplie depuis son profil Goriya et
 * l'offre visée, les RH n'ont plus qu'à vérifier et compléter —, soit une
 * saisie manuelle pour une personne recrutée hors de la plateforme.
 */
export function EmployeeFormDialog({ open, onOpenChange, employee, candidatureId, employees, onSaved }: EmployeeFormDialogProps) {
    const isEdit = !!employee

    const [step, setStep] = useState<Step>("form")
    const [form, setForm] = useState<FormState>(emptyForm)
    const [errors, setErrors] = useState<Errors>({})
    const [serverError, setServerError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    const [candidatures, setCandidatures] = useState<IHireableCandidature[] | null>(null)
    const [candidaturesLoading, setCandidaturesLoading] = useState(false)
    const [candidaturesError, setCandidaturesError] = useState<string | null>(null)
    const [candidatureQuery, setCandidatureQuery] = useState("")
    const [selected, setSelected] = useState<IHireableCandidature | null>(null)
    const [unavailable, setUnavailable] = useState(false)

    const loadCandidatures = useCallback(async (): Promise<IHireableCandidature[] | null> => {
        setCandidaturesLoading(true)
        setCandidaturesError(null)
        try {
            const list = await employeeService.hireableCandidatures()
            setCandidatures(list)
            return list
        } catch (err) {
            setCandidaturesError(extractApiErrorMessage(err, "Impossible de charger les candidatures acceptées."))
            return null
        } finally {
            setCandidaturesLoading(false)
        }
    }, [])

    const applyCandidature = useCallback((c: IHireableCandidature) => {
        const p = c.prefill ?? {}
        setSelected(c)
        setForm({
            ...emptyForm(),
            firstName: p.firstName ?? "",
            lastName: p.lastName ?? "",
            email: p.email ?? "",
            phone: p.phone ?? "",
            address: p.address ?? "",
            jobTitle: p.jobTitle ?? "",
            contractType: (p.contractType as ContractType | undefined) ?? "",
        })
        setErrors({})
        setServerError(null)
        setStep("form")
    }, [])

    // Chaque ouverture repart d'un état propre : une saisie abandonnée ne doit
    // pas réapparaître à l'ajout suivant.
    useEffect(() => {
        if (!open) return
        setErrors({})
        setServerError(null)
        setSelected(null)
        setUnavailable(false)
        setCandidatureQuery("")

        if (employee) {
            setForm(fromEmployee(employee))
            setStep("form")
            return
        }

        setForm(emptyForm())
        if (candidatureId) {
            setStep("candidature")
            void loadCandidatures().then((list) => {
                const match = list?.find((c) => c.id === candidatureId)
                if (match) applyCandidature(match)
                else if (list) setUnavailable(true)
            })
        } else {
            setStep("origin")
        }
    }, [open, employee, candidatureId, loadCandidatures, applyCandidature])

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }))
        setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    }

    const managers = useMemo(
        () => employees.filter((e) => e.id !== employee?.id && e.status !== "TERMINATED"),
        [employees, employee?.id],
    )

    const filteredCandidatures = useMemo(() => {
        const q = normalise(candidatureQuery.trim())
        if (!candidatures) return []
        if (!q) return candidatures
        return candidatures.filter((c) => normalise(`${c.candidateName} ${c.jobOfferTitle ?? ""}`).includes(q))
    }, [candidatures, candidatureQuery])

    const submit = async () => {
        const found = validate(form)
        setErrors(found)
        if (Object.keys(found).length > 0) {
            setServerError("Corrigez les champs signalés avant d'enregistrer.")
            return
        }

        setSaving(true)
        setServerError(null)
        try {
            const payload = toPayload(form)
            const saved = isEdit
                ? await employeeService.update(employee!.id, payload)
                : await employeeService.create({ ...payload, candidatureId: selected?.id ?? null })
            toast.success(
                isEdit
                    ? "Fiche employé mise à jour."
                    : selected
                        ? `${saved.fullName} rejoint vos effectifs.`
                        : "Employé ajouté.",
            )
            onSaved(saved)
            onOpenChange(false)
        } catch (err) {
            const message = extractApiErrorMessage(err, isEdit ? "La mise à jour a échoué." : "L'ajout de l'employé a échoué.")
            setServerError(message)
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    const title = isEdit
        ? "Modifier la fiche"
        : step === "origin"
            ? "Ajouter un employé"
            : step === "candidature"
                ? "Embaucher un candidat"
                : selected
                    ? `Embaucher ${selected.candidateName}`
                    : "Nouvel employé"

    const description = isEdit
        ? employee?.fullName
        : step === "origin"
            ? "Comment ce collaborateur rejoint-il votre entreprise ?"
            : step === "candidature"
                ? "Choisissez une candidature acceptée : sa fiche sera pré-remplie avec les informations Goriya."
                : "Les champs marqués d'un astérisque sont obligatoires."

    return (
        <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description ? <DialogDescription>{description}</DialogDescription> : null}
                </DialogHeader>

                {step === "origin" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <OriginOption
                            icon={Sparkles}
                            title="Depuis une candidature"
                            description="Embauchez un candidat accepté : nom, coordonnées et poste sont repris de Goriya."
                            onClick={() => {
                                setStep("candidature")
                                if (candidatures === null) void loadCandidatures()
                            }}
                        />
                        <OriginOption
                            icon={PenLine}
                            title="Saisie manuelle"
                            description="Pour un collaborateur recruté hors de Goriya : vous remplissez sa fiche."
                            onClick={() => setStep("form")}
                        />
                    </div>
                )}

                {step === "candidature" && (
                    <div className="space-y-3">
                        {unavailable && (
                            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                Cette candidature n&apos;est plus disponible pour une embauche : elle a déjà donné
                                lieu à une fiche employé, ou elle n&apos;est pas acceptée.
                            </p>
                        )}

                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={candidatureQuery}
                                onChange={(e) => setCandidatureQuery(e.target.value)}
                                placeholder="Rechercher un candidat ou une offre..."
                                className="pl-9"
                                aria-label="Rechercher une candidature"
                            />
                        </div>

                        {candidaturesLoading ? (
                            <div className="space-y-2" aria-busy="true">
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                                ))}
                            </div>
                        ) : candidaturesError ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                <p>{candidaturesError}</p>
                                <Button variant="outline" size="sm" className="mt-3" onClick={() => void loadCandidatures()}>
                                    Réessayer
                                </Button>
                            </div>
                        ) : filteredCandidatures.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                                {candidatures && candidatures.length > 0 ? (
                                    "Aucune candidature ne correspond à cette recherche."
                                ) : (
                                    <>
                                        Aucune candidature acceptée n&apos;attend d&apos;embauche. Acceptez un candidat
                                        depuis la page Candidatures, ou saisissez l&apos;employé manuellement.
                                        <div className="mt-3">
                                            <Button variant="outline" size="sm" onClick={() => setStep("form")}>
                                                Saisie manuelle
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                                {filteredCandidatures.map((c) => (
                                    <li key={c.id}>
                                        <button
                                            type="button"
                                            onClick={() => applyCandidature(c)}
                                            className="flex w-full items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-foreground">{c.candidateName}</p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {c.jobOfferTitle ?? "Offre supprimée"}
                                                    {c.appliedDate ? ` · candidature du ${formatDate(c.appliedDate)}` : ""}
                                                </p>
                                            </div>
                                            {c.score !== null && (
                                                <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                                                    {c.score}/100
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {step === "form" && (
                    <div className="space-y-5">
                        {selected && (
                            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-secondary/70 px-3 py-2.5 text-sm">
                                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <p className="text-foreground">
                                    Informations reprises du profil Goriya de <strong>{selected.candidateName}</strong>
                                    {selected.jobOfferTitle ? <> et de l&apos;offre « {selected.jobOfferTitle} »</> : null}.
                                    Vérifiez-les, puis complétez le contrat.
                                </p>
                            </div>
                        )}

                        {serverError && (
                            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {serverError}
                            </p>
                        )}

                        <Section title="Identité">
                            <Field label="Prénom" required error={errors.firstName}>
                                <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} aria-invalid={!!errors.firstName} placeholder="Aïcha" />
                            </Field>
                            <Field label="Nom" required error={errors.lastName}>
                                <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} aria-invalid={!!errors.lastName} placeholder="Koné" />
                            </Field>
                            <Field label="Genre">
                                <Select value={form.gender || NONE} onValueChange={(v) => set("gender", v === NONE ? "" : (v as "M" | "F"))}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Non renseigné" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={NONE}>Non renseigné</SelectItem>
                                        <SelectItem value="F">Femme</SelectItem>
                                        <SelectItem value="M">Homme</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Date de naissance" error={errors.birthDate}>
                                <Input type="date" max={todayIso()} value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} aria-invalid={!!errors.birthDate} />
                            </Field>
                        </Section>

                        <Section title="Coordonnées">
                            <Field label="E-mail" error={errors.email}>
                                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} placeholder="prenom.nom@entreprise.ci" />
                            </Field>
                            <Field label="Téléphone" error={errors.phone}>
                                <PhoneInput value={form.phone} onChange={(v) => set("phone", v)} aria-invalid={!!errors.phone} />
                            </Field>
                            <Field label="Adresse" className="sm:col-span-2">
                                <AutocompleteInput value={form.address} onChange={(v) => set("address", v)} options={LOCALISATIONS} placeholder="Ville, Pays" aria-label="Adresse" />
                            </Field>
                        </Section>

                        <Section title="Poste">
                            <Field label="Intitulé du poste" required error={errors.jobTitle}>
                                <Input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} aria-invalid={!!errors.jobTitle} placeholder="Comptable senior" />
                            </Field>
                            <Field label="Département">
                                <AutocompleteInput value={form.department} onChange={(v) => set("department", v)} options={DEPARTMENTS} placeholder="Finance" aria-label="Département" />
                            </Field>
                            <Field label="Responsable">
                                <Select value={form.managerId} onValueChange={(v) => set("managerId", v)}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Aucun" /></SelectTrigger>
                                    <SelectContent className="max-h-64">
                                        <SelectItem value={NONE}>Aucun responsable</SelectItem>
                                        {managers.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.fullName} <span className="text-muted-foreground">· {m.jobTitle}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Matricule" hint={isEdit ? undefined : "Généré si vide"}>
                                <Input value={form.matricule} onChange={(e) => set("matricule", e.target.value)} placeholder="EMP-0001" />
                            </Field>
                        </Section>

                        <Section title="Contrat et rémunération">
                            <Field label="Type de contrat" required error={errors.contractType}>
                                <Select value={form.contractType || undefined} onValueChange={(v) => set("contractType", v as ContractType)}>
                                    <SelectTrigger className="w-full" aria-invalid={!!errors.contractType}><SelectValue placeholder="Choisir" /></SelectTrigger>
                                    <SelectContent>
                                        {CONTRACT_TYPES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Statut">
                                <Select value={form.status} onValueChange={(v) => set("status", v as EmployeeStatus)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {(Object.keys(EMPLOYEE_STATUS_META) as EmployeeStatus[]).map((s) => (
                                            <SelectItem key={s} value={s}>{EMPLOYEE_STATUS_META[s].label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Date d'embauche" required error={errors.hireDate}>
                                <Input type="date" value={form.hireDate} onChange={(e) => set("hireDate", e.target.value)} aria-invalid={!!errors.hireDate} />
                            </Field>
                            <Field label="Fin de contrat" required={form.contractType === "CDD"} error={errors.contractEndDate}>
                                <Input type="date" min={form.hireDate || undefined} value={form.contractEndDate} onChange={(e) => set("contractEndDate", e.target.value)} aria-invalid={!!errors.contractEndDate} />
                            </Field>
                            <Field label="Salaire brut mensuel (FCFA)" error={errors.salary}>
                                <Input type="number" inputMode="numeric" min={0} value={form.salary} onChange={(e) => set("salary", e.target.value)} aria-invalid={!!errors.salary} placeholder="450000" />
                            </Field>
                            <Field label="Congés annuels (jours)" hint="26 par défaut" error={errors.annualLeaveDays}>
                                <Input type="number" inputMode="numeric" min={0} max={60} value={form.annualLeaveDays} onChange={(e) => set("annualLeaveDays", e.target.value)} aria-invalid={!!errors.annualLeaveDays} />
                            </Field>
                        </Section>

                        <Section title="Contact d'urgence">
                            <Field label="Nom">
                                <Input value={form.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} placeholder="Nom et lien de parenté" />
                            </Field>
                            <Field label="Téléphone" error={errors.emergencyContactPhone}>
                                <PhoneInput value={form.emergencyContactPhone} onChange={(v) => set("emergencyContactPhone", v)} aria-invalid={!!errors.emergencyContactPhone} />
                            </Field>
                        </Section>

                        <Field label="Notes internes">
                            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Informations utiles au service RH (non visibles par l'employé)" />
                        </Field>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:justify-between">
                    <div>
                        {!isEdit && step !== "origin" && (
                            <Button
                                variant="ghost"
                                disabled={saving}
                                onClick={() => {
                                    setServerError(null)
                                    setStep(step === "form" && selected ? "candidature" : "origin")
                                }}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Retour
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
                            Annuler
                        </Button>
                        {step === "form" && (
                            <Button disabled={saving} onClick={() => void submit()}>
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {isEdit ? "Enregistrer" : selected ? "Embaucher" : "Ajouter l'employé"}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function OriginOption({
    icon: Icon,
    title,
    description,
    onClick,
}: {
    icon: ComponentType<{ className?: string }>
    title: string
    description: string
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                <Icon className="h-5 w-5" />
            </span>
            <span>
                <span className="block text-sm font-semibold text-foreground">{title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
            </span>
        </button>
    )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <fieldset className="space-y-3">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
        </fieldset>
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
