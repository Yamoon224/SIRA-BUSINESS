"use client"

import { useParams } from "next/navigation"
import { SubscriptionGate } from "@/components/subscription-gate"
import { CandidateDetail } from "./content"

export default function Page() {
    const { id } = useParams<{ id: string }>()

    return (
        <SubscriptionGate featureLabel="la gestion des recrutements">
            <CandidateDetail id={id} />
        </SubscriptionGate>
    )
}
