"use client"

import { useParams } from "next/navigation"
import { SubscriptionGate } from "@/components/subscription-gate"
import { EmployeeDetail } from "./content"

export default function Page() {
    const { id } = useParams<{ id: string }>()

    return (
        <SubscriptionGate requiredTier="PAID" featureLabel="la gestion des employés">
            <EmployeeDetail id={id} />
        </SubscriptionGate>
    )
}
