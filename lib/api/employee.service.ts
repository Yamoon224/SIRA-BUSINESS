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

export interface IEmployeeLeave {
    id: string
    employeeId: string
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
    type: HrRequestType
    subject: string
    description: string | null
    amount: number | null
    status: HrWorkflowStatus
    decidedAt: string | null
    decidedByName: string | null
    decisionComment: string | null
    createdAt: string
}

const unwrap = <T,>(res: unknown): T => ((res as { data?: T })?.data ?? res) as T

export const employeeService = {
    list: async (filters: { search?: string; status?: string; department?: string } = {}) =>
        unwrap<IEmployee[]>(await apiRequest({ endpoint: "/employees", method: "GET", params: filters })),

    hireableCandidatures: async () =>
        unwrap<IHireableCandidature[]>(await apiRequest({ endpoint: "/employees/hireable-candidatures", method: "GET" })),

    get: async (id: string) => unwrap<IEmployee>(await apiRequest({ endpoint: `/employees/${id}`, method: "GET" })),

    create: async (payload: EmployeePayload) =>
        unwrap<IEmployee>(await apiRequest({ endpoint: "/employees", method: "POST", data: payload })),

    update: async (id: string, payload: Partial<EmployeePayload>) =>
        unwrap<IEmployee>(await apiRequest({ endpoint: `/employees/${id}`, method: "PATCH", data: payload })),

    remove: async (id: string) => apiRequest<{ message: string }>({ endpoint: `/employees/${id}`, method: "DELETE" }),

    // ── Congés ──
    leaves: async (employeeId: string) =>
        unwrap<IEmployeeLeave[]>(await apiRequest({ endpoint: `/employees/${employeeId}/leaves`, method: "GET" })),

    createLeave: async (employeeId: string, payload: { type: LeaveType; startDate: string; endDate: string; reason?: string | null }) =>
        unwrap<IEmployeeLeave>(await apiRequest({ endpoint: `/employees/${employeeId}/leaves`, method: "POST", data: payload })),

    decideLeave: async (id: string, status: HrWorkflowStatus, comment?: string | null) =>
        unwrap<IEmployeeLeave>(await apiRequest({ endpoint: `/employee-leaves/${id}/status`, method: "PATCH", data: { status, comment } })),

    removeLeave: async (id: string) => apiRequest<{ message: string }>({ endpoint: `/employee-leaves/${id}`, method: "DELETE" }),

    // ── Demandes RH ──
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
