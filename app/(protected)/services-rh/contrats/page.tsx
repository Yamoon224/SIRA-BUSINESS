"use client"

import { SubscriptionGate } from "@/components/subscription-gate"
import { ContratsContent } from "./content"

export default function Page() {
    return (
        <SubscriptionGate requiredTier="PAID" featureLabel="la gestion des contrats">
            <ContratsContent />
        </SubscriptionGate>
    )
}
