"use client"

import { Card, CardContent } from "@/components/ui/card"
import { DollarSign } from "lucide-react"
import { SubscriptionGate } from "@/components/subscription-gate"
import { PageHeader } from "@/components/page-header"

function PaieContent() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion de paie"
        description="Préparez les bulletins de salaire, suivez les versements et les charges associées."
      />
      <Card className="border border-border">
        <CardContent className="p-14 text-center text-muted-foreground">
          <DollarSign className="mx-auto mb-4 h-12 w-12 opacity-30" />
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
