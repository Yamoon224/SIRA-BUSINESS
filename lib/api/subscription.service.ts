import { apiRequest } from "@/lib/api-client-http"
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
export type CheckoutResponse =
    | { amount: number; currency: string; clientReference: string }
    | { gateway: string; checkoutUrl: string; sessionId: string }

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

    createCheckout: (data: CreateCheckoutData) =>
        apiRequest<CheckoutResponse>({
            endpoint: "/subscriptions/checkout",
            method: "POST",
            data,
        }),

    verifyCheckout: (transactionId: string, userId: string, planId: string, gateway?: string) =>
        apiRequest<any>({
            endpoint: `/subscriptions/checkout/verify/${transactionId}?userId=${userId}&planId=${planId}${gateway ? `&gateway=${gateway}` : ""}`,
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
