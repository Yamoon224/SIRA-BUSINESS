"use client"

import { SubscriptionGate } from "@/components/subscription-gate"
import { DocumentsContent } from "./content"

export default function Page() {
    return (
        <SubscriptionGate requiredTier="PAID" featureLabel="la gestion des documents RH">
            <DocumentsContent />
        </SubscriptionGate>
    )
}
