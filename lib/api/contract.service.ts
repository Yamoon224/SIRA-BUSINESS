import { apiRequest } from "@/lib/api-client-http"
import { downloadFromApi } from "@/lib/download"
import type { ContractType, IEmployeeSummary } from "@/lib/api/employee.service"

/** Services RH — contrats de travail des employés. */

export type ContractStatus = "DRAFT" | "ACTIVE" | "ENDED" | "TERMINATED"
export type ContractKind = "INITIAL" | "RENEWAL" | "AMENDMENT"

export interface IEmployeeContract {
    id: string
    employeeId: string
    /** Présent sur la liste de l'entreprise uniquement. */
    employee?: IEmployeeSummary | null
    reference: string
    kind: ContractKind
    type: ContractType
    jobTitle: string
    startDate: string
    endDate: string | null
    trialEndDate: string | null
    salary: number | null
    weeklyHours: number | null
    status: ContractStatus
    signedAt: string | null
    terminationDate: string | null
    terminationReason: string | null
    notes: string | null
    document: { name: string; uploadedAt: string | null } | null
    parent?: { id: string; reference: string; kind: ContractKind } | null
    createdByName?: string | null
    createdAt: string
    updatedAt: string
}

export interface ContractPayload {
    kind?: ContractKind
    parentId?: string | null
    type: ContractType
    jobTitle: string
    startDate: string
    endDate?: string | null
    trialEndDate?: string | null
    salary?: number | null
    weeklyHours?: number | null
    status?: "DRAFT" | "ACTIVE"
    signedAt?: string | null
    notes?: string | null
}

export type ContractStatusPayload =
    | { status: "ACTIVE" }
    | { status: "ENDED"; endDate?: string | null }
    | { status: "TERMINATED"; terminationDate?: string | null; terminationReason: string; markEmployeeDeparted?: boolean }

const unwrap = <T,>(res: unknown): T => ((res as { data?: T })?.data ?? res) as T

export const contractService = {
    companyContracts: async (filters: { status?: ContractStatus[]; type?: ContractType[]; employeeId?: string; search?: string } = {}) => {
        const params = { ...filters, status: filters.status?.join(","), type: filters.type?.join(",") }
        return unwrap<IEmployeeContract[]>(await apiRequest({ endpoint: "/employee-contracts", method: "GET", params }))
    },

    employeeContracts: async (employeeId: string) =>
        unwrap<IEmployeeContract[]>(await apiRequest({ endpoint: `/employees/${employeeId}/contracts`, method: "GET" })),

    create: async (employeeId: string, payload: ContractPayload) =>
        unwrap<IEmployeeContract>(await apiRequest({ endpoint: `/employees/${employeeId}/contracts`, method: "POST", data: payload })),

    update: async (id: string, payload: Partial<ContractPayload>) =>
        unwrap<IEmployeeContract>(await apiRequest({ endpoint: `/employee-contracts/${id}`, method: "PATCH", data: payload })),

    changeStatus: async (id: string, payload: ContractStatusPayload) =>
        unwrap<IEmployeeContract>(await apiRequest({ endpoint: `/employee-contracts/${id}/status`, method: "PATCH", data: payload })),

    remove: async (id: string) => apiRequest<{ message: string }>({ endpoint: `/employee-contracts/${id}`, method: "DELETE" }),

    /** Envoi multipart en POST : PHP ignore les corps multipart des PATCH. */
    uploadDocument: async (id: string, file: File) => {
        const data = new FormData()
        data.append("document", file)
        return unwrap<IEmployeeContract>(await apiRequest({ endpoint: `/employee-contracts/${id}/document`, method: "POST", data }))
    },

    removeDocument: async (id: string) =>
        unwrap<IEmployeeContract>(await apiRequest({ endpoint: `/employee-contracts/${id}/document`, method: "DELETE" })),

    downloadDocument: (contract: IEmployeeContract) =>
        downloadFromApi(`/employee-contracts/${contract.id}/document`, contract.document?.name ?? `${contract.reference}.pdf`),

    downloadDraft: (contract: IEmployeeContract) =>
        downloadFromApi(`/employee-contracts/${contract.id}/draft`, `projet-${contract.reference}.docx`),
}
