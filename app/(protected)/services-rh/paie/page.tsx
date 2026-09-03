"use client"

import { Card, CardContent } from "@/components/ui/card"
import { DollarSign } from "lucide-react"
import { SubscriptionGate } from "@/components/subscription-gate"

function PaieContent() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Gestion de Paie</h1>
      <Card className="border border-border">
        <CardContent className="p-12 text-center text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Gestion de la paie et des salaires</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Page() {
  return (
    <SubscriptionGate requiredTier="PAID" featureLabel="la gestion de la paie">
      <PaieContent />
    </SubscriptionGate>
  )
}
