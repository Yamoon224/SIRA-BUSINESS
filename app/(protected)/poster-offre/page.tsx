"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import Content from "./content"
import { SubscriptionGate } from "@/components/subscription-gate"

export default function Page() {
    return (
        <SubscriptionGate featureLabel="la publication d'offres d'emploi">
            {/* Le formulaire lit `?id=` pour rouvrir un brouillon : useSearchParams
                impose une frontière Suspense au rendu statique. */}
            <Suspense
                fallback={
                    <div className="flex items-center justify-center p-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                }
            >
                <Content />
            </Suspense>
        </SubscriptionGate>
    )
}
