import { apiRequest } from "@/lib/api-client-http"

export interface CreateCheckoutData {
    userId: string
    planId: string
    gateway?: string
    successUrl?: string
    errorUrl?: string
    customerPhone?: string
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

    checkSubscription: (userId: string) =>
        apiRequest<{ hasSubscription: boolean; planName: string | null; status: string | null }>({
            endpoint: `/subscriptions/check/${userId}`,
            method: "GET",
        }),
}
