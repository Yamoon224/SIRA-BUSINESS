"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { subscriptionService } from "@/lib/api/subscription.service"
import type { PlanTier } from "@/lib/plan-access"

interface SubscriptionInfo {
    hasSubscription: boolean
    planName: string | null
    status: string | null
    /**
     * Palier renvoyé par le backend : "NONE" | "FREE" | "PAID". L'offre
     * gratuite rend `hasSubscription` vrai sans pour autant ouvrir les
     * fonctionnalités payantes — c'est `tier` qui permet de les distinguer.
     */
    tier: PlanTier
}

export function useSubscription() {
    const { data: session, status: sessionStatus } = useSession()
    const [info, setInfo] = useState<SubscriptionInfo>({
        hasSubscription: false,
        planName: null,
        status: null,
        tier: "NONE",
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (sessionStatus === "loading") return

        const userId = session?.user?.id
        if (!userId) {
            setLoading(false)
            return
        }
        subscriptionService
            .checkSubscription(userId)
            .then((res: any) => {
                const payload = res?.data ?? res
                setInfo({
                    hasSubscription: Boolean(payload?.hasSubscription),
                    planName: payload?.planName ?? null,
                    status: payload?.status ?? null,
                    // Tolère un backend antérieur à l'ajout de `tier` : un
                    // abonnement actif sans palier connu est traité comme payant
                    // (comportement historique), pas comme gratuit.
                    tier: (payload?.tier as PlanTier | undefined)
                        ?? (payload?.hasSubscription ? "PAID" : "NONE"),
                })
            })
            .catch((err) => {
                console.error("[use-subscription] checkSubscription error:", err)
                setError("Impossible de vérifier votre abonnement pour le moment.")
            })
            .finally(() => setLoading(false))
    }, [session, sessionStatus])

    return { ...info, loading, error }
}
