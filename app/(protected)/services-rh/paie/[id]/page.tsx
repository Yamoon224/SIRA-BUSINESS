import { SubscriptionGate } from "@/components/subscription-gate"
import { PayrollRunDetail } from "./content"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return (
        <SubscriptionGate featureLabel="la gestion de la paie">
            <PayrollRunDetail id={id} />
        </SubscriptionGate>
    )
}
