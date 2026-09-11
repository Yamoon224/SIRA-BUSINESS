"use client"

import { SubscriptionGate } from "@/components/subscription-gate"
import { CongesContent } from "./content"

export default function Page() {
    return (
        <SubscriptionGate featureLabel="la gestion des congés">
            <CongesContent />
        </SubscriptionGate>
    )
}
