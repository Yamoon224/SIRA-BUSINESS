import { apiRequest } from "@/lib/api-client-http"
import { IOffer, IPaginatedResponse } from "@/@types/interface"

// `token` n'est nécessaire que pour les appels effectués côté serveur (Server Components,
// avec le token issu de getServerSession). Côté navigateur, ces fonctions sont relayées
// via /api/proxy qui attache l'Authorization à partir de la session NextAuth : `token`
// peut alors être omis.
export const createJobOffer = (payload: any, token?: string) => {
    return apiRequest<IOffer>({
        endpoint: `/job-offers`,
        method: "POST",
        data: payload,
        token,
    })
}

/** Détail d'une offre — sert à rouvrir un brouillon dans le formulaire. */
export const getJobOffer = (id: string, token?: string) => {
    return apiRequest<IOffer>({
        endpoint: `/job-offers/${id}`,
        method: "GET",
        token,
    })
}

export const getJobOffers = (filters: any = {}, token?: string) => {
    return apiRequest<IPaginatedResponse<IOffer>>({
        endpoint: `/job-offers/paginate`,
        method: "GET",
        token,
        params: filters,
    })
}

export const updateJobOffer = (id: string, payload: Partial<IOffer>, token?: string) => {
    return apiRequest<IOffer>({
        endpoint: `/job-offers/${id}`,
        method: "PATCH",
        data: payload,
        token,
    })
}

export const updateJobStatus = (id: string, status: string, token?: string) => {
    // Pas de route dédiée /job-offers/{id}/status côté backend — PATCH
    // /job-offers/{id} accepte déjà `status` (voir UpdateJobOfferRequest) et
    // vérifie que l'entreprise appelante est bien propriétaire de l'offre.
    return apiRequest<IOffer>({
        endpoint: `/job-offers/${id}`,
        method: "PATCH",
        data: { status },
        token,
    })
}

export const deleteJobOffer = (id: string, token?: string) => {
    return apiRequest<null>({
        endpoint: `/job-offers/${id}`,
        method: "DELETE",
        token,
    })
}