import { SubscriptionGate } from "@/components/subscription-gate"
import { CandidateDetail } from "./content"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return (
        <SubscriptionGate featureLabel="la gestion des recrutements">
            <CandidateDetail id={id} />
        </SubscriptionGate>
    )
}
