"use client"

import { SubscriptionGate } from "@/components/subscription-gate"
import { RecrutementsContent } from "./content"

export default function Page() {
    return (
        <SubscriptionGate featureLabel="la gestion des recrutements">
            <RecrutementsContent />
        </SubscriptionGate>
    )
}
