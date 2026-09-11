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
