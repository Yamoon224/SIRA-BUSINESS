import { apiRequest } from "@/lib/api-client-http"
import { downloadFromApi, fetchBlobUrl } from "@/lib/download"
import type { IEmployeeSummary } from "@/lib/api/employee.service"

/**
 * Services RH — documents : fichiers déposés, attestations générées, et en
 * lecture seule les contrats signés et bulletins validés des autres modules.
 */

export type DocumentCategory =
    | "IDENTITY"
    | "RESUME_DIPLOMA"
    | "CONTRACT"
    | "CERTIFICATE"
    | "PAYROLL"
    | "MEDICAL"
    | "TRAINING"
    | "DISCIPLINARY"
    | "POLICY"
    | "OTHER"

/** CONTRACT et PAYSLIP : documents gérés dans leur module, affichés ici en lecture seule. */
export type DocumentSource = "UPLOAD" | "GENERATED" | "CONTRACT" | "PAYSLIP"

export type HrDocumentTemplate = "WORK_CERTIFICATE" | "SALARY_CERTIFICATE" | "EMPLOYMENT_CERTIFICATE"

export interface IHrDocument {
    id: string
    source: DocumentSource
    category: DocumentCategory
    title: string
    description: string | null
    fileName: string
    mimeType: string | null
    size: number | null
    issuedAt: string | null
    expiresAt: string | null
    /** Nul pour un document d'entreprise. */
    employee: IEmployeeSummary | null
    uploadedByName: string | null
    template: HrDocumentTemplate | null
    hrRequestId: string | null
    /** Chemin d'API du téléchargement, propre à chaque source. */
    downloadPath: string
    editable: boolean
    createdAt: string | null
}

export interface DocumentFilters {
    employeeId?: string
    scope?: "all" | "company" | "employees"
    category?: DocumentCategory[]
    search?: string
    expiringWithin?: number
    includeLinked?: boolean
}

export interface DocumentMetadata {
    employeeId?: string | null
    category: DocumentCategory
    title?: string | null
    description?: string | null
    issuedAt?: string | null
    expiresAt?: string | null
}

export interface GenerateDocumentPayload {
    template: HrDocumentTemplate
    hrRequestId?: string | null
    signatoryName?: string | null
    signatoryTitle?: string | null
    city?: string | null
}

const unwrap = <T,>(res: unknown): T => ((res as { data?: T })?.data ?? res) as T

export const hrDocumentService = {
    list: async (filters: DocumentFilters = {}) => {
        const params = {
            ...filters,
            category: filters.category?.join(","),
            includeLinked: filters.includeLinked === undefined ? undefined : filters.includeLinked ? 1 : 0,
        }
        return unwrap<IHrDocument[]>(await apiRequest({ endpoint: "/hr-documents", method: "GET", params }))
    },

    /** Envoi multipart en POST : PHP ignore les corps multipart des PATCH. */
    upload: async (file: File, metadata: DocumentMetadata) => {
        const data = new FormData()
        data.append("file", file)
        for (const [key, value] of Object.entries(metadata)) {
            if (value !== null && value !== undefined && value !== "") data.append(key, String(value))
        }
        return unwrap<IHrDocument>(await apiRequest({ endpoint: "/hr-documents", method: "POST", data }))
    },

    update: async (id: string, metadata: Partial<DocumentMetadata>) =>
        unwrap<IHrDocument>(await apiRequest({ endpoint: `/hr-documents/${id}`, method: "PATCH", data: metadata })),

    remove: async (id: string) => apiRequest<{ message: string }>({ endpoint: `/hr-documents/${id}`, method: "DELETE" }),

    generate: async (employeeId: string, payload: GenerateDocumentPayload) =>
        unwrap<IHrDocument>(await apiRequest({ endpoint: `/employees/${employeeId}/documents/generate`, method: "POST", data: payload })),

    download: (document: Pick<IHrDocument, "downloadPath" | "fileName">) => downloadFromApi(document.downloadPath, document.fileName),

    /** URL blob pour l'aperçu d'un PDF ou d'une image ; à libérer après usage. */
    previewUrl: (document: Pick<IHrDocument, "downloadPath">) => fetchBlobUrl(document.downloadPath),
}
