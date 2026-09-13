"use client"

import React from "react"
import Link from "next/link"
import { Lock, Sparkles, Loader2, Check, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSubscription } from "@/hooks/use-subscription"
import { PAID_PLAN_ONLY, tierAllows, type RequiredTier } from "@/lib/plan-access"
import { cheapestPlanIncluding, planIncludesFeature } from "@/lib/pricing-feature-matrix"

interface SubscriptionGateProps {
    children: React.ReactNode
    featureLabel?: string
    /**
     * Palier minimum exigé par la page :
     *   - "ANY" (défaut) : n'importe quel abonnement actif, offre gratuite comprise ;
     *   - "PAID" : forfait payant, Business ou Business+ indifféremment.
     *
     * ⚠️ "PAID" ne distingue pas Business de Business+ — pour une
     * fonctionnalité réservée à Business+ (ou à Sur Mesure, jamais
     * autoservice), utiliser `feature` à la place, pas `requiredTier`.
     */
    requiredTier?: RequiredTier
    /**
     * Ligne de `ENTERPRISE_PLAN_FEATURE_MATRIX` (ex. "Intégration API",
     * "Services RH — Gestion de paie") que le forfait actif doit inclure.
     * Prioritaire sur `requiredTier` quand fourni — nécessaire dès qu'une
     * fonctionnalité n'est pas simplement "tout forfait payant" mais propre
     * à Business+ (ou à Sur Mesure, qui n'est même pas un SubscriptionPlan
     * souscriptible : la fonctionnalité reste alors fermée en libre-service).
     */
    feature?: string
}

export function SubscriptionGate({
    children,
    featureLabel = "cette fonctionnalité",
    requiredTier = "ANY",
    feature,
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

    const allowed = feature ? planIncludesFeature(planName, feature) : tierAllows(tier, requiredTier)

    if (allowed) {
        return <>{children}</>
    }

    // Distinguer les deux refus : « aucun abonnement » (il faut en choisir un,
    // l'offre gratuite suffit) et « forfait actuel insuffisant » (il faut
    // monter en gamme — offre gratuite, ou Business sur une fonctionnalité
    // Business+/Sur Mesure). Sans ça, un compte avec un forfait actif lisait
    // « Abonnement requis » alors qu'il en a déjà un.
    const needsUpgrade = feature ? tier !== "NONE" : tier === "FREE"

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
                        {planName ? ` votre offre « ${planName} »` : " votre offre gratuite"}.{" "}
                        {feature && cheapestPlanIncluding(feature) === null
                            ? "Cette fonctionnalité est sur mesure : contactez notre équipe commerciale pour l'activer."
                            : feature
                              ? `Passez au forfait ${cheapestPlanIncluding(feature)} pour la débloquer.`
                              : "Passez à un forfait payant (Business ou Business+) pour la débloquer."}
                    </>
                ) : (
                    <>
                        Un abonnement actif est nécessaire pour accéder à {featureLabel}. L&apos;offre gratuite
                        vous permet déjà de tester l&apos;essentiel de l&apos;espace recrutement.
                    </>
                )}
            </p>

            {/* Liste générique (Goriya Meet, Intégrations API) : n'a de sens que
                pour le gate par palier ("PAID" tout court) — un gate par
                `feature` explique déjà précisément quel forfait débloque quoi
                dans le message ci-dessus. */}
            {needsUpgrade && !feature && (
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
                {/* Rien à comparer si aucun forfait souscriptible ne couvre la
                    fonctionnalité (Sur Mesure only, ex. Intégration API) —
                    le seul chemin est le contact commercial. */}
                {feature && cheapestPlanIncluding(feature) === null ? (
                    <Button asChild className="gap-2 rounded-full bg-[#2f6de6] px-6 text-white hover:bg-[#2157d3]">
                        <Link href="/assistance">
                            <Sparkles className="h-4 w-4" />
                            Contacter l&apos;équipe commerciale
                        </Link>
                    </Button>
                ) : (
                    <Button asChild className="gap-2 rounded-full bg-[#2f6de6] px-6 text-white hover:bg-[#2157d3]">
                        <Link href="/auth/signup/plan">
                            <Sparkles className="h-4 w-4" />
                            {needsUpgrade ? "Comparer les forfaits" : "Voir les offres"}
                        </Link>
                    </Button>
                )}
                <Button asChild variant="outline" className="rounded-full px-6">
                    <Link href="/dashboard">Retour au tableau de bord</Link>
                </Button>
            </div>
        </div>
    )
}
