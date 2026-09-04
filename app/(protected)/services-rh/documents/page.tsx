"use client"

import { Card, CardContent } from "@/components/ui/card"
import { FolderOpen } from "lucide-react"
import { SubscriptionGate } from "@/components/subscription-gate"
import { PageHeader } from "@/components/page-header"

function DocumentsContent() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents RH"
        description="Rangez et partagez les documents administratifs de vos employés en un seul endroit."
      />
      <Card className="border border-border">
        <CardContent className="p-14 text-center text-muted-foreground">
          <FolderOpen className="mx-auto mb-4 h-12 w-12 opacity-30" />
          <p>Gestion des documents RH</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Page() {
  return (
    <SubscriptionGate requiredTier="PAID" featureLabel="la gestion des documents RH">
      <DocumentsContent />
    </SubscriptionGate>
  )
}
