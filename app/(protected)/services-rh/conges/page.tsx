"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import { SubscriptionGate } from "@/components/subscription-gate"
import { PageHeader } from "@/components/page-header"

function CongesContent() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Congés"
        description="Suivez les demandes d'absence de vos équipes, les soldes de congés et les validations en attente."
      />
      <Card className="border border-border">
        <CardContent className="p-14 text-center text-muted-foreground">
          <Calendar className="mx-auto mb-4 h-12 w-12 opacity-30" />
          <p>Gestion des congés - bientôt disponible</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Page() {
  return (
    <SubscriptionGate requiredTier="PAID" featureLabel="la gestion des congés">
      <CongesContent />
    </SubscriptionGate>
  )
}
