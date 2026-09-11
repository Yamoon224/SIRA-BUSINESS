/**
 * Référentiels et formatage des Services RH, alignés sur les enums backend
 * (`EmployeeStatus`, `LeaveType`, `HrRequestType`, `HrWorkflowStatus`).
 * Les types de contrat et départements reprennent ceux des offres d'emploi :
 * un employé embauché depuis une offre garde les mêmes valeurs.
 */

import type {
    EmployeeStatus,
    HrRequestType,
    HrWorkflowStatus,
    IEmployee,
    LeaveType,
} from "@/lib/api/employee.service"
import type { ContractKind, ContractStatus, IEmployeeContract } from "@/lib/api/contract.service"
import type { PayrollRunStatus } from "@/lib/api/payroll.service"
import type { InterviewRecommendation, InterviewStatus, InterviewType, RecruitmentStage } from "@/lib/api/recruitment.service"
import type { DocumentCategory, DocumentSource, HrDocumentTemplate, IHrDocument } from "@/lib/api/hr-document.service"

export { DEPARTMENTS, JOB_TYPES as CONTRACT_TYPES, jobTypeLabel as contractTypeLabel } from "@/lib/data/offres"

export type StatusMeta = { label: string; className: string }

export const EMPLOYEE_STATUS_META: Record<EmployeeStatus, StatusMeta & { dot: string }> = {
    ACTIVE: { label: "Actif", className: "bg-green-100 text-green-700", dot: "bg-green-500" },
    PROBATION: { label: "Période d'essai", className: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
    SUSPENDED: { label: "Suspendu", className: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
    TERMINATED: { label: "Parti", className: "bg-gray-200 text-gray-600", dot: "bg-gray-400" },
}

/** Libellé affiché quand un employé est en congé aujourd'hui, par-dessus son statut. */
export const ON_LEAVE_META: StatusMeta = { label: "En congé", className: "bg-violet-100 text-violet-700" }

/** `color` : teinte du type dans le planning et les pastilles de la page Congés. */
export const LEAVE_TYPE_META: Record<LeaveType, { label: string; countsAgainstBalance: boolean; color: string }> = {
    PAID: { label: "Congés payés", countsAgainstBalance: true, color: "bg-blue-500" },
    SICK: { label: "Maladie", countsAgainstBalance: false, color: "bg-rose-500" },
    MATERNITY: { label: "Maternité", countsAgainstBalance: false, color: "bg-pink-500" },
    PATERNITY: { label: "Paternité", countsAgainstBalance: false, color: "bg-cyan-500" },
    FAMILY_EVENT: { label: "Événement familial", countsAgainstBalance: false, color: "bg-violet-500" },
    UNPAID: { label: "Sans solde", countsAgainstBalance: false, color: "bg-slate-500" },
    OTHER: { label: "Autre absence", countsAgainstBalance: false, color: "bg-teal-500" },
}

export const HR_REQUEST_TYPE_META: Record<HrRequestType, { label: string; needsAmount: boolean }> = {
    WORK_CERTIFICATE: { label: "Attestation de travail", needsAmount: false },
    SALARY_CERTIFICATE: { label: "Attestation de salaire", needsAmount: false },
    SALARY_ADVANCE: { label: "Avance sur salaire", needsAmount: true },
    TRAINING: { label: "Formation", needsAmount: false },
    EQUIPMENT: { label: "Matériel", needsAmount: false },
    SCHEDULE_CHANGE: { label: "Aménagement d'horaires", needsAmount: false },
    OTHER: { label: "Autre demande", needsAmount: false },
}

export const WORKFLOW_STATUS_META: Record<HrWorkflowStatus, StatusMeta> = {
    PENDING: { label: "En attente", className: "bg-amber-100 text-amber-700" },
    IN_PROGRESS: { label: "En cours", className: "bg-blue-100 text-blue-700" },
    APPROVED: { label: "Approuvé", className: "bg-green-100 text-green-700" },
    REJECTED: { label: "Refusé", className: "bg-red-100 text-red-700" },
    CANCELLED: { label: "Annulé", className: "bg-gray-200 text-gray-600" },
}

// ── Contrats ───────────────────────────────────────────────────────────────

export const CONTRACT_STATUS_META: Record<ContractStatus, StatusMeta> = {
    DRAFT: { label: "Brouillon", className: "bg-gray-200 text-gray-700" },
    ACTIVE: { label: "En vigueur", className: "bg-green-100 text-green-700" },
    ENDED: { label: "Terminé", className: "bg-slate-100 text-slate-600" },
    TERMINATED: { label: "Rompu", className: "bg-red-100 text-red-700" },
}

export const CONTRACT_KIND_META: Record<ContractKind, { label: string }> = {
    INITIAL: { label: "Contrat initial" },
    RENEWAL: { label: "Renouvellement" },
    AMENDMENT: { label: "Avenant" },
}

/** Types de contrat qui ont nécessairement une date de fin (même règle que le backend). */
export const FIXED_TERM_CONTRACT_TYPES: readonly string[] = ["CDD", "STAGE", "ALTERNANCE"]

/** Fenêtres d'alerte : échéance d'un contrat, fin de période d'essai. */
export const CONTRACT_ALERT_DAYS = { ending: 30, trial: 15 } as const

export type ContractAlertKind = "EXPIRED" | "NO_CONTRACT" | "ENDING_SOON" | "TRIAL_ENDING" | "UNSIGNED"

export interface ContractAlert {
    key: string
    kind: ContractAlertKind
    employeeId: string
    employeeName: string
    contract?: IEmployeeContract
    date?: string
    /** Jours restants (ou écoulés pour un contrat échu). */
    days?: number
    /** Pour NO_CONTRACT : l'employé a déjà eu des contrats. */
    hasHistory?: boolean
}

/**
 * Situations à traiter sur les contrats, les plus urgentes d'abord : contrat
 * échu toujours en vigueur, employé présent sans contrat, échéance proche, fin
 * de période d'essai proche, contrat en vigueur non signé.
 */
export function contractAlerts(contracts: IEmployeeContract[], employees: IEmployee[] | null, today: string = todayIso()): ContractAlert[] {
    const names = new Map((employees ?? []).map((e) => [e.id, e.fullName]))
    const nameOf = (c: IEmployeeContract) => c.employee?.fullName ?? names.get(c.employeeId) ?? "Employé"
    const alerts: ContractAlert[] = []

    for (const contract of contracts) {
        if (contract.status !== "ACTIVE") continue
        const base = { employeeId: contract.employeeId, employeeName: nameOf(contract), contract }

        if (contract.endDate && contract.endDate < today) {
            alerts.push({ ...base, key: `expired-${contract.id}`, kind: "EXPIRED", date: contract.endDate, days: daysBetween(contract.endDate, today) })
        } else if (contract.endDate && daysBetween(today, contract.endDate) <= CONTRACT_ALERT_DAYS.ending) {
            alerts.push({ ...base, key: `ending-${contract.id}`, kind: "ENDING_SOON", date: contract.endDate, days: daysBetween(today, contract.endDate) })
        }
        if (contract.trialEndDate && contract.trialEndDate >= today && daysBetween(today, contract.trialEndDate) <= CONTRACT_ALERT_DAYS.trial) {
            alerts.push({ ...base, key: `trial-${contract.id}`, kind: "TRIAL_ENDING", date: contract.trialEndDate, days: daysBetween(today, contract.trialEndDate) })
        }
        if (!contract.signedAt && !contract.document) {
            alerts.push({ ...base, key: `unsigned-${contract.id}`, kind: "UNSIGNED" })
        }
    }

    if (employees) {
        const withActive = new Set(contracts.filter((c) => c.status === "ACTIVE").map((c) => c.employeeId))
        const withHistory = new Set(contracts.map((c) => c.employeeId))
        for (const employee of employees) {
            if (employee.status === "TERMINATED" || withActive.has(employee.id)) continue
            alerts.push({
                key: `none-${employee.id}`,
                kind: "NO_CONTRACT",
                employeeId: employee.id,
                employeeName: employee.fullName,
                hasHistory: withHistory.has(employee.id),
            })
        }
    }

    const rank: Record<ContractAlertKind, number> = { EXPIRED: 0, NO_CONTRACT: 1, ENDING_SOON: 2, TRIAL_ENDING: 3, UNSIGNED: 4 }
    return alerts.sort((a, b) => rank[a.kind] - rank[b.kind] || (a.days ?? 0) - (b.days ?? 0))
}

/** « Du 5 janv. 2026 au 31 déc. 2026 » ou « Depuis le 5 janv. 2026 · durée indéterminée ». */
export function contractPeriod(contract: Pick<IEmployeeContract, "startDate" | "endDate">): string {
    return contract.endDate
        ? `Du ${formatDate(contract.startDate)} au ${formatDate(contract.endDate)}`
        : `Depuis le ${formatDate(contract.startDate)} · durée indéterminée`
}

// ── Paie ───────────────────────────────────────────────────────────────────

export const PAYROLL_STATUS_META: Record<PayrollRunStatus, StatusMeta & { hint: string }> = {
    DRAFT: { label: "Brouillon", className: "bg-amber-100 text-amber-700", hint: "Recalculable et ajustable" },
    VALIDATED: { label: "Validée", className: "bg-blue-100 text-blue-700", hint: "Bulletins figés, en attente de paiement" },
    PAID: { label: "Payée", className: "bg-green-100 text-green-700", hint: "Virements effectués" },
}

/** « septembre 2026 » → « Septembre 2026 » : les mois s'écrivent en minuscules en français. */
export function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1)
}

export function periodLabel(year: number, month: number): string {
    return capitalize(new Date(year, month - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }))
}

/** Taux en pourcentage, sans zéros inutiles : 6,3 %, 5,75 %, 16 %. */
export function formatRate(rate: number | null | undefined): string {
    if (rate === null || rate === undefined) return "—"
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(rate)} %`
}

// ── Recrutements ───────────────────────────────────────────────────────────

/** Ordre des colonnes du pipeline. */
export const RECRUITMENT_STAGES: readonly RecruitmentStage[] = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]

/** Étapes où le candidat est encore « en course ». */
export const ACTIVE_RECRUITMENT_STAGES: readonly RecruitmentStage[] = ["NEW", "SCREENING", "INTERVIEW", "OFFER"]

export const RECRUITMENT_STAGE_META: Record<RecruitmentStage, StatusMeta & { dot: string; hint: string }> = {
    NEW: { label: "Nouveau", className: "bg-slate-100 text-slate-700", dot: "bg-slate-400", hint: "Candidatures reçues, à trier" },
    SCREENING: { label: "Présélection", className: "bg-blue-100 text-blue-700", dot: "bg-blue-500", hint: "Profils retenus pour un premier échange" },
    INTERVIEW: { label: "Entretien", className: "bg-violet-100 text-violet-700", dot: "bg-violet-500", hint: "Entretiens planifiés ou passés" },
    OFFER: { label: "Offre", className: "bg-amber-100 text-amber-700", dot: "bg-amber-500", hint: "Proposition faite, embauche à finaliser" },
    HIRED: { label: "Embauché", className: "bg-green-100 text-green-700", dot: "bg-green-500", hint: "Fiche employé créée" },
    REJECTED: { label: "Refusé", className: "bg-red-100 text-red-700", dot: "bg-red-400", hint: "Candidats écartés" },
}

/** Statut que voit le candidat à chaque étape (même correspondance que le backend). */
export const CANDIDATE_VISIBLE_STATUS: Record<RecruitmentStage, string> = {
    NEW: "En attente",
    SCREENING: "En cours de traitement",
    INTERVIEW: "En cours de traitement",
    OFFER: "Acceptée",
    HIRED: "Acceptée",
    REJECTED: "Refusée",
}

export const INTERVIEW_TYPE_META: Record<InterviewType, { label: string; locationLabel: string; locationPlaceholder: string }> = {
    PHONE: { label: "Téléphone", locationLabel: "Numéro à appeler", locationPlaceholder: "+225 07 00 00 00 00 (facultatif)" },
    VIDEO: { label: "Visioconférence", locationLabel: "Lien de visioconférence", locationPlaceholder: "https://meet.google.com/…" },
    ONSITE: { label: "Sur place", locationLabel: "Adresse", locationPlaceholder: "Immeuble, étage, quartier…" },
}

export const INTERVIEW_STATUS_META: Record<InterviewStatus, StatusMeta> = {
    SCHEDULED: { label: "Planifié", className: "bg-blue-100 text-blue-700" },
    COMPLETED: { label: "Passé", className: "bg-green-100 text-green-700" },
    CANCELLED: { label: "Annulé", className: "bg-gray-200 text-gray-600" },
    NO_SHOW: { label: "Candidat absent", className: "bg-red-100 text-red-700" },
}

export const RECOMMENDATION_META: Record<InterviewRecommendation, StatusMeta> = {
    HIRE: { label: "À recruter", className: "bg-green-100 text-green-700" },
    MAYBE: { label: "À revoir", className: "bg-amber-100 text-amber-700" },
    NO_HIRE: { label: "Ne pas recruter", className: "bg-red-100 text-red-700" },
}

/** « mar. 15 sept., 10:00 » : date-heure ISO affichée en heure locale. */
export function formatDateTime(value?: string | null, options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }): string {
    if (!value) return "—"
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("fr-FR", options)
}

export function formatTime(value?: string | null): string {
    return formatDateTime(value, { hour: "2-digit", minute: "2-digit" })
}

/** Date-heure ISO → valeur d'un champ `datetime-local` (« aaaa-mm-jjThh:mm », heure locale). */
export function toDatetimeLocal(value?: string | Date | null): string {
    if (!value) return ""
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${toIsoDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** « aujourd'hui », « hier », « il y a 12 j » depuis une date ISO. */
export function sinceLabel(value?: string | null): string {
    if (!value) return "—"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "—"
    const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
    if (days <= 0) return "aujourd'hui"
    if (days === 1) return "hier"
    return `il y a ${days} j`
}

// ── Documents RH ───────────────────────────────────────────────────────────

export const DOCUMENT_CATEGORY_META: Record<DocumentCategory, StatusMeta & { hint: string }> = {
    IDENTITY: { label: "Identité", className: "bg-blue-100 text-blue-700", hint: "Pièce d'identité, titre de séjour" },
    RESUME_DIPLOMA: { label: "CV et diplômes", className: "bg-indigo-100 text-indigo-700", hint: "CV, diplômes, certifications" },
    CONTRACT: { label: "Contrats", className: "bg-emerald-100 text-emerald-700", hint: "Contrats, avenants, promesses d'embauche" },
    CERTIFICATE: { label: "Attestations", className: "bg-violet-100 text-violet-700", hint: "Attestations et certificats" },
    PAYROLL: { label: "Paie", className: "bg-amber-100 text-amber-700", hint: "Bulletins, CNPS, fiscalité" },
    MEDICAL: { label: "Médical", className: "bg-rose-100 text-rose-700", hint: "Visite médicale, aptitude" },
    TRAINING: { label: "Formation", className: "bg-cyan-100 text-cyan-700", hint: "Attestations de formation" },
    DISCIPLINARY: { label: "Disciplinaire", className: "bg-red-100 text-red-700", hint: "Courriers, avertissements" },
    POLICY: { label: "Règlements", className: "bg-slate-200 text-slate-700", hint: "Règlement intérieur, chartes, procédures" },
    OTHER: { label: "Autre", className: "bg-gray-200 text-gray-600", hint: "Tout autre document" },
}

export const DOCUMENT_SOURCE_LABEL: Record<DocumentSource, string> = {
    UPLOAD: "Déposé",
    GENERATED: "Rédigé par Goriya",
    CONTRACT: "Depuis Contrats",
    PAYSLIP: "Depuis Paie",
}

export const HR_TEMPLATE_META: Record<HrDocumentTemplate, { label: string; description: string; requestType: HrRequestType }> = {
    WORK_CERTIFICATE: {
        label: "Attestation de travail",
        description: "L'employé travaille (ou a travaillé) dans l'entreprise : poste, date d'entrée, type de contrat.",
        requestType: "WORK_CERTIFICATE",
    },
    SALARY_CERTIFICATE: {
        label: "Attestation de salaire",
        description: "Salaire brut mensuel et, s'il y en a, les trois derniers bulletins validés.",
        requestType: "SALARY_CERTIFICATE",
    },
    EMPLOYMENT_CERTIFICATE: {
        label: "Certificat de travail",
        description: "Remis au départ de l'employé : période d'emploi et poste occupé.",
        requestType: "WORK_CERTIFICATE",
    },
}

/** Pièces attendues dans le dossier de chaque employé présent. */
export const EMPLOYEE_FILE_CHECKLIST: readonly { key: string; label: string; category: DocumentCategory }[] = [
    { key: "identity", label: "Pièce d'identité", category: "IDENTITY" },
    { key: "resume", label: "CV ou diplômes", category: "RESUME_DIPLOMA" },
    { key: "contract", label: "Contrat signé", category: "CONTRACT" },
    { key: "medical", label: "Visite médicale", category: "MEDICAL" },
]

export type FileChecklistStatus = "ok" | "expired" | "missing"

/** État de chaque pièce du dossier : présente et valide, expirée, ou manquante. */
export function employeeFileStatus(documents: IHrDocument[], today: string = todayIso()) {
    return EMPLOYEE_FILE_CHECKLIST.map((item) => {
        const matching = documents.filter((d) => d.category === item.category)
        const status: FileChecklistStatus =
            matching.length === 0 ? "missing" : matching.some((d) => !d.expiresAt || d.expiresAt >= today) ? "ok" : "expired"
        return { ...item, status }
    })
}

/** Fenêtre d'alerte avant l'expiration d'un document. */
export const DOCUMENT_EXPIRY_WARNING_DAYS = 30

export function documentExpiry(document: Pick<IHrDocument, "expiresAt">, today: string = todayIso()): { kind: "EXPIRED" | "SOON" | "VALID"; days: number } | null {
    if (!document.expiresAt) return null
    const days = daysBetween(today, document.expiresAt)
    if (days < 0) return { kind: "EXPIRED", days: -days }
    return { kind: days <= DOCUMENT_EXPIRY_WARNING_DAYS ? "SOON" : "VALID", days }
}

/** « 245 Ko », « 1,2 Mo ». */
export function formatFileSize(bytes?: number | null): string {
    if (bytes === null || bytes === undefined) return ""
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} Mo`
}

// ── Formatage ──────────────────────────────────────────────────────────────

/**
 * « aaaa-mm-jj » → Date locale à minuit. `new Date("2026-09-14")` serait lu en
 * UTC et afficherait le 13 septembre sous un fuseau négatif.
 */
export function parseLocalDate(value?: string | null): Date | null {
    if (!value) return null
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value?: string | null, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
    const date = parseLocalDate(value)
    return date ? date.toLocaleDateString("fr-FR", options) : "—"
}

export function formatFcfa(amount?: number | null): string {
    if (amount === null || amount === undefined) return "—"
    return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`
}

/** Ancienneté lisible depuis la date d'embauche : « 2 ans et 3 mois », « 5 mois ». */
export function seniority(hireDate?: string | null, now: Date = new Date()): string {
    const start = parseLocalDate(hireDate)
    if (!start) return "—"
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
    if (now.getDate() < start.getDate()) months -= 1
    if (months < 0) return "Arrivée à venir"
    if (months === 0) return "Moins d'un mois"
    const years = Math.floor(months / 12)
    const rest = months % 12
    const y = years > 0 ? `${years} an${years > 1 ? "s" : ""}` : ""
    const m = rest > 0 ? `${rest} mois` : ""
    return [y, m].filter(Boolean).join(" et ")
}

export function initials(firstName?: string | null, lastName?: string | null): string {
    return `${(firstName ?? "").trim().charAt(0)}${(lastName ?? "").trim().charAt(0)}`.toUpperCase() || "?"
}

/**
 * Jours ouvrés (lundi-vendredi) entre deux dates incluses — même calcul que
 * EmployeeLeaveService::businessDays, pour annoncer la durée avant l'envoi.
 */
export function businessDays(startDate?: string | null, endDate?: string | null): number {
    const start = parseLocalDate(startDate)
    const end = parseLocalDate(endDate)
    if (!start || !end || end < start) return 0
    let days = 0
    for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
        const weekday = day.getDay()
        if (weekday !== 0 && weekday !== 6) days++
    }
    return days
}

/** Date locale → « aaaa-mm-jj ». Les dates ISO se comparent alors comme des chaînes. */
export function toIsoDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Date du jour au format « aaaa-mm-jj », en heure locale. */
export function todayIso(): string {
    return toIsoDate(new Date())
}

/** « aaaa-mm-jj » décalée de `days` jours (négatif pour reculer). */
export function addDaysIso(value: string, days: number): string {
    const date = parseLocalDate(value) ?? new Date()
    date.setDate(date.getDate() + days)
    return toIsoDate(date)
}

/** Nombre de jours entre deux dates « aaaa-mm-jj » (négatif si `to` précède `from`). */
export function daysBetween(from: string, to: string): number {
    const start = parseLocalDate(from)
    const end = parseLocalDate(to)
    if (!start || !end) return 0
    return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

/** Minuscules sans accents, pour une recherche qui trouve « Kone » dans « Koné ». */
export function normaliseText(value: string): string {
    return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}
