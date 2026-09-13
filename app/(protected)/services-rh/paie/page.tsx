"use client"

import { SubscriptionGate } from "@/components/subscription-gate"
import { PaieContent } from "./content"

export default function Page() {
    return (
        <SubscriptionGate featureLabel="la gestion de la paie" feature="Services RH — Gestion de paie">
            <PaieContent />
        </SubscriptionGate>
    )
}
