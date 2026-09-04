"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users } from "lucide-react"
import { SubscriptionGate } from "@/components/subscription-gate"
import { PageHeader } from "@/components/page-header"

function EmployesContent() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Employés"
        description="Gérez le répertoire de vos collaborateurs : fiches, postes et rattachements d'équipe."
      />
      <Card className="border border-border">
        <CardContent className="p-14 text-center text-muted-foreground">
          <Users className="mx-auto mb-4 h-12 w-12 opacity-30" />
          <p>Gestion des employés - bientôt disponible</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Page() {
  return (
    <SubscriptionGate requiredTier="PAID" featureLabel="la gestion des employés">
      <EmployesContent />
    </SubscriptionGate>
  )
}
