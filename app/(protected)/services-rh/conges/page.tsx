"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import { SubscriptionGate } from "@/components/subscription-gate"

function CongesContent() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Congés</h1>
      <Card className="border border-border">
        <CardContent className="p-12 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Gestion des congés - bientôt disponible</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Page() {
  return (
    <SubscriptionGate featureLabel="la gestion des congés">
      <CongesContent />
    </SubscriptionGate>
  )
}
