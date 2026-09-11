import { apiRequest } from "@/lib/api-client-http"

export type SurveyQuestionType = "RATING" | "TEXT"
export type SurveyStatus = "DRAFT" | "ACTIVE" | "CLOSED"

export interface ISurveyQuestion {
    id: string
    question: string
    type: SurveyQuestionType
}

export interface IEmployeeSurvey {
    id: string
    title: string
    description: string | null
    questions: ISurveyQuestion[]
    status: SurveyStatus
    /** Passée cette date, l'évaluation ACTIVE est clôturée automatiquement. */
    dueDate: string | null
    /** Département ciblé — `null` = toute l'entreprise. */
    department: string | null
    /** Au moins une réponse reçue — les questions ne sont alors plus modifiables. */
    hasResponses: boolean
    createdAt: string
}

export interface IEmployeeSurveyStats {
    participationCount: number
    ratings: Record<string, number>
    trends: string[]
    frictionPoints: string[]
    recommendations: string[]
}

export const employeeSurveyService = {
    list: async () => {
        return apiRequest<IEmployeeSurvey[]>({ endpoint: "/employee-surveys", method: "GET" })
    },

    create: async (data: { title: string; description?: string; questions: ISurveyQuestion[]; dueDate?: string | null; department?: string | null }) => {
        return apiRequest<IEmployeeSurvey>({ endpoint: "/employee-surveys", method: "POST", data })
    },

    /**
     * `questions` refusé (400) si l'évaluation a déjà reçu des réponses —
     * voir `hasResponses` sur IEmployeeSurvey pour désactiver ce champ côté UI.
     */
    update: async (id: string, data: Partial<{ title: string; description: string | null; questions: ISurveyQuestion[]; dueDate: string | null; department: string | null }>) => {
        return apiRequest<IEmployeeSurvey>({ endpoint: `/employee-surveys/${id}`, method: "PATCH", data })
    },

    get: async (id: string) => {
        return apiRequest<IEmployeeSurvey>({ endpoint: `/employee-surveys/${id}`, method: "GET" })
    },

    updateStatus: async (id: string, status: SurveyStatus) => {
        return apiRequest<IEmployeeSurvey>({ endpoint: `/employee-surveys/${id}/status`, method: "PATCH", data: { status } })
    },

    stats: async (id: string) => {
        return apiRequest<IEmployeeSurveyStats>({ endpoint: `/employee-surveys/${id}/stats`, method: "GET" })
    },

    remove: async (id: string) => {
        return apiRequest<{ message: string }>({ endpoint: `/employee-surveys/${id}`, method: "DELETE" })
    },
}
