"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { SubscriptionGate } from "@/components/subscription-gate"
import { EmployeesContent } from "./content"

export default function Page() {
    return (
        <SubscriptionGate requiredTier="PAID" featureLabel="la gestion des employés">
            {/* La liste lit `?candidature=` (embauche ouverte depuis la page
                Candidatures) : useSearchParams impose une frontière Suspense. */}
            <Suspense
                fallback={
                    <div className="flex items-center justify-center p-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                }
            >
                <EmployeesContent />
            </Suspense>
        </SubscriptionGate>
    )
}
