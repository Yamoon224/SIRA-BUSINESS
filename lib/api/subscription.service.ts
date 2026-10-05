import { apiRequest } from "@/lib/api-client-http"
import { rememberPaymentReference } from "@/lib/payment-reference"
import type { PlanTier } from "@/lib/plan-access"

export interface CreateCheckoutData {
    userId: string
    planId: string
    gateway?: string
    successUrl?: string
    errorUrl?: string
    customerPhone?: string
    /** Durée choisie (1/3/6/12 mois) pour les plans à périodicité choisissable — voir Plan.availablePeriods. Défaut backend : 1. */
    periodMonths?: number
    /** Code promo optionnel — revalidé et recalculé côté serveur. */
    promoCode?: string
}

export interface ITransaction {
    id: string
    planId: string | null
    planName: string | null
    gateway: "kkiapay" | "wave" | "stripe" | "paiementpro"
    amount: number
    currency: string
    status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED"
    createdAt: string
}

// Kkiapay (widget client) renvoie amount/clientReference ; les gateways à
// session hébergée (paiementpro, wave, stripe) renvoient une checkoutUrl.
// originalAmount/discountAmount ne sont présents que si un code promo a été
// appliqué (voir SubscriptionService::checkout()).
export type CheckoutResponse =
    | { amount: number; currency: string; clientReference: string; originalAmount?: number; discountAmount?: number }
    | { gateway: string; checkoutUrl: string; sessionId: string; amount?: number; originalAmount?: number; discountAmount?: number }

export const subscriptionService = {
    getPlans: (userType: "USER" | "ENTREPRISE" = "ENTREPRISE") =>
        apiRequest({ endpoint: `/subscriptions/plans?userType=${userType}`, method: "GET" }),

    getPaymentGateways: () =>
        apiRequest<{ enabledGateways: string[]; defaultGateway: string }>({
            endpoint: "/subscriptions/payment-gateways",
            method: "GET",
        }),

    subscribe: (data: { userId: string; planId: string }) =>
        apiRequest({ endpoint: "/subscriptions/subscribe", method: "POST", data }),

    createCheckout: async (data: CreateCheckoutData) => {
        const res = await apiRequest<CheckoutResponse>({
            endpoint: "/subscriptions/checkout",
            method: "POST",
            data,
        })
        // Session hébergée : on garde la référence avant de quitter le site,
        // au cas où l'URL de retour du prestataire reviendrait abîmée.
        rememberPaymentReference(((res as any)?.data ?? res)?.sessionId)
        return res
    },

    verifyCheckout: (transactionId: string, userId: string, planId: string, gateway?: string) =>
        apiRequest<any>({
            endpoint: `/subscriptions/checkout/verify/${transactionId}?userId=${userId}&planId=${planId}${gateway ? `&gateway=${gateway}` : ""}`,
            method: "GET",
        }),

    /**
     * État d'un paiement à partir de sa seule référence. Endpoint public :
     * après un paiement mobile, la page de retour s'ouvre souvent dans un
     * navigateur où l'utilisateur n'est pas connecté.
     */
    checkoutStatus: (reference: string) =>
        apiRequest<{ status: "PENDING" | "SUCCESS" | "FAILED" | "UNKNOWN"; purpose: string | null; planName: string | null }>({
            endpoint: `/subscriptions/checkout/status/${encodeURIComponent(reference)}`,
            method: "GET",
        }),

    getMySubscription: (userId: string) =>
        apiRequest({ endpoint: `/subscriptions/me/${userId}`, method: "GET" }),

    cancelSubscription: (userId: string) =>
        apiRequest({ endpoint: `/subscriptions/me/${userId}`, method: "DELETE" }),

    /** Historique des paiements (« Historique des factures » côté paramètres). */
    getTransactions: (userId: string, page = 1, limit = 20) =>
        apiRequest<{ data: ITransaction[]; meta: { total: number; page: number; limit: number; totalPages: number } }>({
            endpoint: `/subscriptions/me/${userId}/transactions`,
            method: "GET",
            params: { page, limit },
        }),

    checkSubscription: (userId: string) =>
        apiRequest<{
            hasSubscription: boolean
            planName: string | null
            status: string | null
            planId?: string | null
            planPrice?: number | null
            /** "NONE" | "FREE" | "PAID" — voir lib/plan-access.ts */
            tier?: PlanTier
        }>({
            endpoint: `/subscriptions/check/${userId}`,
            method: "GET",
        }),
}
