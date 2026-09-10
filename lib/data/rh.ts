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
    LeaveType,
} from "@/lib/api/employee.service"

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

export const LEAVE_TYPE_META: Record<LeaveType, { label: string; countsAgainstBalance: boolean }> = {
    PAID: { label: "Congés payés", countsAgainstBalance: true },
    SICK: { label: "Maladie", countsAgainstBalance: false },
    MATERNITY: { label: "Maternité", countsAgainstBalance: false },
    PATERNITY: { label: "Paternité", countsAgainstBalance: false },
    FAMILY_EVENT: { label: "Événement familial", countsAgainstBalance: false },
    UNPAID: { label: "Sans solde", countsAgainstBalance: false },
    OTHER: { label: "Autre absence", countsAgainstBalance: false },
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

/** Date du jour au format « aaaa-mm-jj », en heure locale. */
export function todayIso(): string {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
