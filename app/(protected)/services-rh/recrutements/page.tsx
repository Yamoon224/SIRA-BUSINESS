"use client"

import { Card, CardContent } from "@/components/ui/card"
import { UserPlus } from "lucide-react"
import { SubscriptionGate } from "@/components/subscription-gate"
import { PageHeader } from "@/components/page-header"

function RecrutementsContent() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Recrutements"
        description="Pilotez votre pipeline de recrutement, du premier contact jusqu'à l'embauche."
      />
      <Card className="border border-border">
        <CardContent className="p-14 text-center text-muted-foreground">
          <UserPlus className="mx-auto mb-4 h-12 w-12 opacity-30" />
          <p>Pipeline de recrutement - bientôt disponible</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Page() {
  return (
    <SubscriptionGate requiredTier="PAID" featureLabel="la gestion des recrutements">
      <RecrutementsContent />
    </SubscriptionGate>
  )
}
