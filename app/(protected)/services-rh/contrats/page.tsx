"use client"

import { Card, CardContent } from "@/components/ui/card"
import { FileSignature } from "lucide-react"
import { SubscriptionGate } from "@/components/subscription-gate"
import { PageHeader } from "@/components/page-header"

function ContratsContent() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contrats"
        description="Centralisez les contrats de vos employés : rédaction, signature et suivi des échéances."
      />
      <Card className="border border-border">
        <CardContent className="p-14 text-center text-muted-foreground">
          <FileSignature className="mx-auto mb-4 h-12 w-12 opacity-30" />
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
