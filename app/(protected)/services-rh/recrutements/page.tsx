"use client"

import { Card, CardContent } from "@/components/ui/card"
import { UserPlus } from "lucide-react"
import { SubscriptionGate } from "@/components/subscription-gate"

function RecrutementsContent() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Recrutements</h1>
      <Card className="border border-border">
        <CardContent className="p-12 text-center text-muted-foreground">
          <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-30" />
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
