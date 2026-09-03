"use client"

import { Card, CardContent } from "@/components/ui/card"
import { FileSignature } from "lucide-react"
import { SubscriptionGate } from "@/components/subscription-gate"

function ContratsContent() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Contrats</h1>
      <Card className="border border-border">
        <CardContent className="p-12 text-center text-muted-foreground">
          <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Gestion des contrats employés</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Page() {
  return (
    <SubscriptionGate requiredTier="PAID" featureLabel="la gestion des contrats">
      <ContratsContent />
    </SubscriptionGate>
  )
}
