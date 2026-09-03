"use client"

import React from "react"
import Link from "next/link"
import { Lock, Sparkles, Loader2, Check, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSubscription } from "@/hooks/use-subscription"
import { PAID_PLAN_ONLY, tierAllows, type RequiredTier } from "@/lib/plan-access"

interface SubscriptionGateProps {
    children: React.ReactNode
    featureLabel?: string
    /**
     * Palier minimum exigé par la page :
     *   - "ANY" (défaut) : n'importe quel abonnement actif, offre gratuite comprise ;
     *   - "PAID" : forfait payant uniquement (fonctionnalité premium).
     */
    requiredTier?: RequiredTier
}

export function SubscriptionGate({
    children,
    featureLabel = "cette fonctionnalité",
    requiredTier = "ANY",
}: SubscriptionGateProps) {
    // ⚠️ Ce contrôle est purement côté client (UX) : il évite d'afficher une fonctionnalité
    // non accessible, mais ne remplace pas une vérification côté backend. Le vrai contrôle
    // d'accès à la ressource doit être appliqué par l'API appelée (retour 401/403 si
    // l'abonnement n'est pas actif ou d'un palier insuffisant).
    const { tier, planName, loading, error } = useSubscription()

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-[#2f6de6]" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] px-4 text-center">
                <p className="text-sm text-destructive">{error}</p>
            </div>
        )
    }

    if (tierAllows(tier, requiredTier)) {
        return <>{children}</>
    }

    // Distinguer les deux refus : « aucun abonnement » (il faut en choisir un,
    // l'offre gratuite suffit) et « offre gratuite insuffisante » (il faut
    // monter en gamme). Sans ça, un compte gratuit lisait « Abonnement requis »
    // alors qu'il en a déjà un.
    const needsUpgrade = tier === "FREE"

    return (
        <div className="mx-auto flex min-h-[400px] w-full max-w-lg flex-col items-center justify-center px-4 py-8 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3ff]">
                {needsUpgrade ? (
                    <ArrowUpRight className="h-6 w-6 text-[#2f6de6]" />
                ) : (
                    <Lock className="h-6 w-6 text-[#2f6de6]" />
                )}
            </div>

            <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                {needsUpgrade ? "Offre supérieure requise" : "Abonnement requis"}
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {needsUpgrade ? (
                    <>
                        {featureLabel.charAt(0).toUpperCase() + featureLabel.slice(1)} n&apos;est pas incluse dans
                        {planName ? ` votre offre « ${planName} »` : " votre offre gratuite"}. Passez à un forfait
                        payant (Business ou Business+) pour la débloquer.
                    </>
                ) : (
                    <>
                        Un abonnement actif est nécessaire pour accéder à {featureLabel}. L&apos;offre gratuite
                        vous permet déjà de tester l&apos;essentiel de l&apos;espace recrutement.
                    </>
                )}
            </p>

            {needsUpgrade && (
                <ul className="mt-5 w-full max-w-sm space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-left">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Inclus dans les forfaits payants
                    </p>
                    {PAID_PLAN_ONLY.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2f6de6]" />
                            {item}
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button asChild className="gap-2 rounded-full bg-[#2f6de6] px-6 text-white hover:bg-[#2157d3]">
                    <Link href="/auth/signup/plan">
                        <Sparkles className="h-4 w-4" />
                        {needsUpgrade ? "Comparer les forfaits" : "Voir les offres"}
                    </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full px-6">
                    <Link href="/dashboard">Retour au tableau de bord</Link>
                </Button>
            </div>
        </div>
    )
}
