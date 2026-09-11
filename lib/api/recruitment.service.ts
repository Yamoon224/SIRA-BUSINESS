import { apiRequest } from "@/lib/api-client-http"

/**
 * Services RH — pipeline de recrutement : candidats (les candidatures reçues
 * sur les offres), entretiens et notes des recruteurs.
 */

export type RecruitmentStage = "NEW" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED"
export type InterviewType = "PHONE" | "VIDEO" | "ONSITE"
export type InterviewStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
export type InterviewOutcome = Exclude<InterviewStatus, "SCHEDULED">
export type InterviewRecommendation = "HIRE" | "MAYBE" | "NO_HIRE"

export interface IRecruitmentInterview {
    id: string
    candidatureId: string
    /** Présent sur la liste de l'entreprise uniquement. */
    candidate?: {
        id: string
        name: string
        email: string
        jobOfferId: string
        jobOfferTitle: string | null
        stage: RecruitmentStage
    } | null
    type: InterviewType
    /** Date-heure ISO avec décalage : à afficher en heure locale. */
    scheduledAt: string
    endsAt: string
    durationMinutes: number
    location: string | null
    /** Entretien en visio : salle GORIYA Meet, rejointe via /calls/{id}/join. */
    callSession: { id: string; status: "SCHEDULED" | "ACTIVE" | "ENDED" } | null
    interviewers: string | null
    description: string | null
    status: InterviewStatus
    rating: number | null
    recommendation: InterviewRecommendation | null
    feedback: string | null
    candidateNotifiedAt: string | null
    createdByName?: string | null
    outcomeByName?: string | null
    outcomeAt: string | null
    createdAt: string | null
}

export interface IRecruitmentNote {
    id: string
    body: string
    authorId: string | null
    authorName: string | null
    createdAt: string | null
}

export interface IStageEvent {
    id: string
    fromStage: RecruitmentStage | null
    toStage: RecruitmentStage
    comment: string | null
    authorName: string | null
    createdAt: string | null
}

export interface IRecruitmentCandidate {
    /** Identifiant de la candidature. */
    id: string
    userId: string
    candidateName: string
    candidateEmail: string
    candidateTitle: string | null
    candidateSkills: string[]
    candidatePhone: string | null
    candidateLocation: string | null
    jobOffer: { id: string; title: string; status: string | null; type: string | null; location: string | null } | null
    score: number
    appliedDate: string | null
    status: string
    stage: RecruitmentStage
    stageSince: string | null
    rejectionReason: string | null
    hasResume: boolean
    assessmentScore: number | null
    interviewsCount: number
    nextInterview: { id: string; type: InterviewType; scheduledAt: string } | null
    /** Entretiens dont la date est passée sans compte rendu. */
    feedbackDueCount: number
    averageRating: number | null
    notesCount: number
    employeeId: string | null
    // ── Dossier complet (détail uniquement) ──
    coverLetter?: string | null
    resume?: { id: string; name: string; url: string | null; mimeType?: string | null } | null
    answers?: { id: string; question: string; type: string; value: string[] }[]
    interviews?: IRecruitmentInterview[]
    notes?: IRecruitmentNote[]
    history?: IStageEvent[]
}

export interface IRecruitmentJobOffer {
    id: string
    title: string
    status: string | null
    type: string | null
    location: string | null
    publishDate: string | null
    endDate: string | null
    candidatesCount: number
    stages: Record<RecruitmentStage, number>
}

export interface InterviewPayload {
    type: InterviewType
    scheduledAt: string
    durationMinutes?: number | null
    location?: string | null
    interviewers?: string | null
    description?: string | null
    notifyCandidate?: boolean
}

export interface InterviewOutcomePayload {
    status: InterviewOutcome
    rating?: number | null
    recommendation?: InterviewRecommendation | null
    feedback?: string | null
    notifyCandidate?: boolean
}

const unwrap = <T,>(res: unknown): T => ((res as { data?: T })?.data ?? res) as T

export const recruitmentService = {
    jobOffers: async () =>
        unwrap<IRecruitmentJobOffer[]>(await apiRequest({ endpoint: "/recruitment/job-offers", method: "GET" })),

    candidates: async (filters: { jobOfferId?: string; stage?: RecruitmentStage[]; search?: string } = {}) => {
        const params = { ...filters, stage: filters.stage?.join(",") }
        return unwrap<IRecruitmentCandidate[]>(await apiRequest({ endpoint: "/recruitment/candidates", method: "GET", params }))
    },

    candidate: async (id: string) =>
        unwrap<IRecruitmentCandidate>(await apiRequest({ endpoint: `/recruitment/candidates/${id}`, method: "GET" })),

    moveStage: async (id: string, stage: RecruitmentStage, comment?: string | null) =>
        unwrap<IRecruitmentCandidate>(await apiRequest({ endpoint: `/recruitment/candidates/${id}/stage`, method: "PATCH", data: { stage, comment } })),

    addNote: async (id: string, body: string) =>
        unwrap<IRecruitmentNote>(await apiRequest({ endpoint: `/recruitment/candidates/${id}/notes`, method: "POST", data: { body } })),

    removeNote: async (id: string) => apiRequest<{ message: string }>({ endpoint: `/recruitment/notes/${id}`, method: "DELETE" }),

    interviews: async (filters: { from?: string; to?: string; status?: InterviewStatus[] } = {}) => {
        const params = { ...filters, status: filters.status?.join(",") }
        return unwrap<IRecruitmentInterview[]>(await apiRequest({ endpoint: "/recruitment/interviews", method: "GET", params }))
    },

    scheduleInterview: async (candidateId: string, payload: InterviewPayload) =>
        unwrap<IRecruitmentInterview>(await apiRequest({ endpoint: `/recruitment/candidates/${candidateId}/interviews`, method: "POST", data: payload })),

    updateInterview: async (id: string, payload: Partial<InterviewPayload>) =>
        unwrap<IRecruitmentInterview>(await apiRequest({ endpoint: `/recruitment/interviews/${id}`, method: "PATCH", data: payload })),

    recordOutcome: async (id: string, payload: InterviewOutcomePayload) =>
        unwrap<IRecruitmentInterview>(await apiRequest({ endpoint: `/recruitment/interviews/${id}/outcome`, method: "PATCH", data: payload })),

    removeInterview: async (id: string) => apiRequest<{ message: string }>({ endpoint: `/recruitment/interviews/${id}`, method: "DELETE" }),
}
