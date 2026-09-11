import { apiRequest } from "@/lib/api-client-http"

/**
 * Services RH — employés, congés et demandes RH.
 *
 * Les resources du backend ne sont pas enveloppées dans `data` ; `unwrap`
 * garde néanmoins le repli habituel au cas où une réponse le serait.
 */

export type EmployeeStatus = "ACTIVE" | "PROBATION" | "SUSPENDED" | "TERMINATED"
export type ContractType = "CDI" | "CDD" | "STAGE" | "ALTERNANCE" | "FREELANCE" | "TEMPS_PARTIEL"
export type EmployeeSource = "CANDIDATURE" | "MANUAL"
export type LeaveType = "PAID" | "SICK" | "MATERNITY" | "PATERNITY" | "FAMILY_EVENT" | "UNPAID" | "OTHER"
export type HrWorkflowStatus = "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED" | "CANCELLED"
export type HrRequestType =
    | "WORK_CERTIFICATE"
    | "SALARY_CERTIFICATE"
    | "SALARY_ADVANCE"
    | "TRAINING"
    | "EQUIPMENT"
    | "SCHEDULE_CHANGE"
    | "OTHER"

export interface ILeaveBalance {
    year: number
    entitlement: number
    taken: number
    pending: number
    remaining: number
}

export interface IEmployee {
    id: string
    source: EmployeeSource
    candidatureId: string | null
    userId: string | null
    hiredFrom?: {
        candidatureId: string
        jobOfferId: string
        jobOfferTitle: string | null
        appliedDate: string | null
    } | null
    matricule: string
    firstName: string
    lastName: string
    fullName: string
    gender: "M" | "F" | null
    birthDate: string | null
    email: string | null
    phone: string | null
    address: string | null
    jobTitle: string
    department: string | null
    contractType: ContractType
    hireDate: string
    contractEndDate: string | null
    salary: number | null
    annualLeaveDays: number
    status: EmployeeStatus
    onLeaveToday: boolean
    manager?: { id: string; fullName: string; jobTitle: string } | null
    pendingLeavesCount: number
    pendingRequestsCount: number
    emergencyContactName: string | null
    emergencyContactPhone: string | null
    notes: string | null
    /** Présent sur la fiche détail uniquement. */
    leaveBalance?: ILeaveBalance
    /** Contrat en vigueur : type, date de fin et salaire de la fiche en découlent. */
    activeContract?: {
        id: string
        reference: string
        kind: "INITIAL" | "RENEWAL" | "AMENDMENT"
        type: ContractType
        startDate: string
        endDate: string | null
        trialEndDate: string | null
        signed: boolean
    } | null
    createdAt: string
    updatedAt: string
}

/** Corps accepté par POST / PATCH /employees. */
export interface EmployeePayload {
    candidatureId?: string | null
    matricule?: string | null
    firstName: string
    lastName: string
    gender?: "M" | "F" | null
    birthDate?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    jobTitle: string
    department?: string | null
    contractType: ContractType | ""
    hireDate: string
    contractEndDate?: string | null
    salary?: number | null
    annualLeaveDays?: number | null
    status?: EmployeeStatus | null
    managerId?: string | null
    emergencyContactName?: string | null
    emergencyContactPhone?: string | null
    notes?: string | null
}

/** Candidature acceptée pas encore embauchée, avec la fiche pré-remplie par Goriya. */
export interface IHireableCandidature {
    id: string
    candidateName: string
    candidateEmail: string
    jobOfferId: string
    jobOfferTitle: string | null
    appliedDate: string | null
    score: number | null
    prefill: Partial<Pick<EmployeePayload, "firstName" | "lastName" | "email" | "phone" | "address" | "jobTitle" | "contractType">>
}

/** Champs extraits d'un CV pour pré-remplir le formulaire d'ajout — chacun `null` si indéterminé. */
export interface ExtractedCvInfo {
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
    address: string | null
    jobTitle: string | null
}

/** Identité minimale d'un employé, embarquée dans les congés et les soldes de la page Congés. */
export interface IEmployeeSummary {
    id: string
    fullName: string
    firstName: string
    lastName: string
    matricule: string
    jobTitle: string
    department: string | null
    status: EmployeeStatus
}

/** Solde de congés d'un employé, tel que listé par la page Congés. */
export interface ILeaveBalanceRow extends ILeaveBalance {
    employee: IEmployeeSummary
}

export interface LeaveFilters {
    status?: HrWorkflowStatus[]
    type?: LeaveType[]
    employeeId?: string
    department?: string
    search?: string
    from?: string
    to?: string
}

export interface IEmployeeLeave {
    id: string
    employeeId: string
    /** Présent sur la liste de l'entreprise uniquement. */
    employee?: IEmployeeSummary | null
    type: LeaveType
    startDate: string
    endDate: string
    days: number
    reason: string | null
    status: HrWorkflowStatus
    decidedAt: string | null
    decidedByName: string | null
    decisionComment: string | null
    createdAt: string
}

export interface IHrRequest {
    id: string
    employeeId: string
    /** Présent sur la liste de l'entreprise uniquement. */
    employee?: IEmployeeSummary | null
    type: HrRequestType
    subject: string
    description: string | null
    amount: number | null
    status: HrWorkflowStatus
    decidedAt: string | null
    decidedByName: string | null
    decisionComment: string | null
    /** Avance sur salaire déjà retenue sur un bulletin de paie validé. */
    payslipId?: string | null
    /** Attestation délivrée en réponse à la demande (Documents RH). */
    document?: { id: string; title: string; fileName: string } | null
    createdAt: string
}

export interface HrRequestFilters {
    status?: HrWorkflowStatus[]
    type?: HrRequestType[]
    employeeId?: string
    department?: string
    search?: string
}

const unwrap = <T,>(res: unknown): T => ((res as { data?: T })?.data ?? res) as T

export const employeeService = {
    list: async (filters: { search?: string; status?: string; department?: string } = {}) =>
        unwrap<IEmployee[]>(await apiRequest({ endpoint: "/employees", method: "GET", params: filters })),

    hireableCandidatures: async () =>
        unwrap<IHireableCandidature[]>(await apiRequest({ endpoint: "/employees/hireable-candidatures", method: "GET" })),

    /** Extrait identité/coordonnées/poste d'un CV pour pré-remplir le formulaire d'ajout. */
    extractFromCv: async (file: File) => {
        const body = new FormData()
        body.append("file", file)
        return unwrap<ExtractedCvInfo>(await apiRequest({ endpoint: "/employees/extract-cv", method: "POST", data: body }))
    },

    get: async (id: string) => unwrap<IEmployee>(await apiRequest({ endpoint: `/employees/${id}`, method: "GET" })),

    create: async (payload: EmployeePayload) =>
        unwrap<IEmployee>(await apiRequest({ endpoint: "/employees", method: "POST", data: payload })),

    update: async (id: string, payload: Partial<EmployeePayload>) =>
        unwrap<IEmployee>(await apiRequest({ endpoint: `/employees/${id}`, method: "PATCH", data: payload })),

    remove: async (id: string) => apiRequest<{ message: string }>({ endpoint: `/employees/${id}`, method: "DELETE" }),

    // ── Congés ──
    /** Congés de toute l'entreprise (page Congés), employé inclus. */
    companyLeaves: async (filters: LeaveFilters = {}) => {
        const params = { ...filters, status: filters.status?.join(","), type: filters.type?.join(",") }
        return unwrap<IEmployeeLeave[]>(await apiRequest({ endpoint: "/employee-leaves", method: "GET", params }))
    },

    /** Soldes de congés payés de tous les employés présents. */
    leaveBalances: async (year?: number) =>
        unwrap<ILeaveBalanceRow[]>(await apiRequest({ endpoint: "/employee-leaves/balances", method: "GET", params: year ? { year } : {} })),

    leaves: async (employeeId: string) =>
        unwrap<IEmployeeLeave[]>(await apiRequest({ endpoint: `/employees/${employeeId}/leaves`, method: "GET" })),

    createLeave: async (employeeId: string, payload: { type: LeaveType; startDate: string; endDate: string; reason?: string | null }) =>
        unwrap<IEmployeeLeave>(await apiRequest({ endpoint: `/employees/${employeeId}/leaves`, method: "POST", data: payload })),

    decideLeave: async (id: string, status: HrWorkflowStatus, comment?: string | null) =>
        unwrap<IEmployeeLeave>(await apiRequest({ endpoint: `/employee-leaves/${id}/status`, method: "PATCH", data: { status, comment } })),

    removeLeave: async (id: string) => apiRequest<{ message: string }>({ endpoint: `/employee-leaves/${id}`, method: "DELETE" }),

    // ── Demandes RH ──
    /** Demandes RH de toute l'entreprise (page Demandes RH), employé inclus. */
    companyRequests: async (filters: HrRequestFilters = {}) => {
        const params = { ...filters, status: filters.status?.join(","), type: filters.type?.join(",") }
        return unwrap<IHrRequest[]>(await apiRequest({ endpoint: "/hr-requests", method: "GET", params }))
    },

    requests: async (employeeId: string) =>
        unwrap<IHrRequest[]>(await apiRequest({ endpoint: `/employees/${employeeId}/hr-requests`, method: "GET" })),

    createRequest: async (
        employeeId: string,
        payload: { type: HrRequestType; subject: string; description?: string | null; amount?: number | null },
    ) => unwrap<IHrRequest>(await apiRequest({ endpoint: `/employees/${employeeId}/hr-requests`, method: "POST", data: payload })),

    decideRequest: async (id: string, status: HrWorkflowStatus, comment?: string | null) =>
        unwrap<IHrRequest>(await apiRequest({ endpoint: `/hr-requests/${id}/status`, method: "PATCH", data: { status, comment } })),

    removeRequest: async (id: string) => apiRequest<{ message: string }>({ endpoint: `/hr-requests/${id}`, method: "DELETE" }),
}
