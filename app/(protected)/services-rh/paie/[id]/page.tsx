"use client"

import { useParams } from "next/navigation"
import { SubscriptionGate } from "@/components/subscription-gate"
import { PayrollRunDetail } from "./content"

export default function Page() {
    const { id } = useParams<{ id: string }>()

    return (
        <SubscriptionGate requiredTier="PAID" featureLabel="la gestion de la paie">
            <PayrollRunDetail id={id} />
        </SubscriptionGate>
    )
}
