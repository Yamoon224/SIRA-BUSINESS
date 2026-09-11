import { apiRequest } from "@/lib/api-client-http"
import { downloadFromApi } from "@/lib/download"

/** Services RH — paie : paramètres, périodes et bulletins. */

export type PayrollRunStatus = "DRAFT" | "VALIDATED" | "PAID"
export type PayslipLineSection = "EARNING" | "CONTRIBUTION" | "TAX" | "DEDUCTION"

export interface IContributionRule {
    code: string
    label: string
    /** En pourcentage. */
    employeeRate: number
    employerRate: number
    /** Plafond mensuel de la base, FCFA ; null : sans plafond. */
    ceiling: number | null
    employeeFixed: number
    employerFixed: number
}

export interface ITaxBracket {
    /** Plafond mensuel ; null pour la dernière tranche. */
    upTo: number | null
    rate: number
}

export interface IPayrollSettings {
    /** CI : valeurs par défaut Côte d'Ivoire ; CUSTOM : modifiées par l'entreprise. */
    preset: "CI" | "CUSTOM"
    taxLabel: string
    taxableAbatementPercent: number
    deductEmployeeContributions: boolean
    contributions: IContributionRule[]
    taxBrackets: ITaxBracket[]
    updatedAt: string | null
}

export interface IPayrollTotals {
    gross: number
    employeeContributions: number
    employerContributions: number
    tax: number
    net: number
    employerCost: number
}

export interface IPayslipLine {
    code: string
    label: string
    section: PayslipLineSection
    base: number | null
    employeeRate: number | null
    employerRate: number | null
    /** Gain (négatif pour un prorata ou une absence) ou retenue salariale. */
    employeeAmount: number
    employerAmount: number | null
}

export interface IPayslipBonus {
    label: string
    amount: number
    taxable: boolean
    subjectToContributions: boolean
}

export interface IPayslipDeduction {
    label: string
    amount: number
}

export interface IPayslipWarning {
    code: string
    message: string
    blocking: boolean
}

export interface IPayslip {
    id: string
    payrollRunId: string
    employeeId: string | null
    employee: {
        fullName: string
        firstName: string
        lastName: string
        matricule: string
        jobTitle: string
        department: string | null
        contractType: string | null
        contractReference: string | null
        hireDate: string | null
    }
    run?: { id: string; year: number; month: number; label: string; status: PayrollRunStatus; paymentDate: string | null } | null
    baseSalary: number
    businessDays: number
    workedDays: number
    unpaidLeaveDays: number
    bonuses: IPayslipBonus[]
    deductions: IPayslipDeduction[]
    lines: IPayslipLine[]
    warnings: IPayslipWarning[]
    gross: number
    employeeContributions: number
    employerContributions: number
    taxable: number
    tax: number
    advances: number
    otherDeductions: number
    net: number
    employerCost: number
    updatedAt: string
}

export interface IPayrollRun {
    id: string
    year: number
    month: number
    label: string
    status: PayrollRunStatus
    employeesCount: number
    totals: IPayrollTotals
    paymentDate: string | null
    paymentReference: string | null
    validatedAt: string | null
    paidAt: string | null
    createdAt: string
    /** Présent sur le détail d'une période. */
    payslips?: IPayslip[]
}

const unwrap = <T,>(res: unknown): T => ((res as { data?: T })?.data ?? res) as T
const pad = (n: number) => String(n).padStart(2, "0")

export const payrollService = {
    settings: async () => unwrap<IPayrollSettings>(await apiRequest({ endpoint: "/payroll/settings", method: "GET" })),

    updateSettings: async (payload: Omit<IPayrollSettings, "preset" | "updatedAt">) =>
        unwrap<IPayrollSettings>(await apiRequest({ endpoint: "/payroll/settings", method: "PUT", data: payload })),

    resetSettings: async () => unwrap<IPayrollSettings>(await apiRequest({ endpoint: "/payroll/settings/reset", method: "POST" })),

    runs: async () => unwrap<IPayrollRun[]>(await apiRequest({ endpoint: "/payroll/runs", method: "GET" })),

    createRun: async (year: number, month: number) =>
        unwrap<IPayrollRun>(await apiRequest({ endpoint: "/payroll/runs", method: "POST", data: { year, month } })),

    run: async (id: string) => unwrap<IPayrollRun>(await apiRequest({ endpoint: `/payroll/runs/${id}`, method: "GET" })),

    recompute: async (id: string) => unwrap<IPayrollRun>(await apiRequest({ endpoint: `/payroll/runs/${id}/recompute`, method: "POST" })),

    validate: async (id: string) => unwrap<IPayrollRun>(await apiRequest({ endpoint: `/payroll/runs/${id}/validate`, method: "POST" })),

    reopen: async (id: string) => unwrap<IPayrollRun>(await apiRequest({ endpoint: `/payroll/runs/${id}/reopen`, method: "POST" })),

    pay: async (id: string, payload: { paymentDate: string; paymentReference?: string | null }) =>
        unwrap<IPayrollRun>(await apiRequest({ endpoint: `/payroll/runs/${id}/pay`, method: "POST", data: payload })),

    removeRun: async (id: string) => apiRequest<{ message: string }>({ endpoint: `/payroll/runs/${id}`, method: "DELETE" }),

    exportRun: (run: Pick<IPayrollRun, "id" | "year" | "month">) =>
        downloadFromApi(`/payroll/runs/${run.id}/export`, `journal-paie-${run.year}-${pad(run.month)}.csv`),

    payslip: async (id: string) => unwrap<IPayslip>(await apiRequest({ endpoint: `/payslips/${id}`, method: "GET" })),

    updatePayslip: async (id: string, payload: { bonuses: IPayslipBonus[]; deductions: IPayslipDeduction[] }) =>
        unwrap<IPayslip>(await apiRequest({ endpoint: `/payslips/${id}`, method: "PATCH", data: payload })),

    downloadPayslip: (payslip: IPayslip, run: Pick<IPayrollRun, "year" | "month">) =>
        downloadFromApi(`/payslips/${payslip.id}/document`, `bulletin-${run.year}-${pad(run.month)}-${payslip.employee.matricule}.docx`),

    employeePayslips: async (employeeId: string) =>
        unwrap<IPayslip[]>(await apiRequest({ endpoint: `/employees/${employeeId}/payslips`, method: "GET" })),
}
