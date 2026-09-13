"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { PhoneInput, telephoneValide } from "@/components/phone-input"
import { Check, Gift, Loader2, Sparkles, Star } from "lucide-react"
import { CustomPlanCard } from "@/components/marketing/custom-plan-card"
import { PlanFeatureList } from "@/components/pricing/plan-feature-list"
import { subscriptionService } from "@/lib/api/subscription.service"
import { extractApiErrorMessage } from "@/lib/api-error"
import {
    beginSignupFlow,
    clearSignupFlow,
    completeSignupFlow,
    getSignupUserId,
    isInSignupFlow,
} from "@/lib/signup-flow"
import { toast } from "sonner"

interface Plan {
    id: string
    name: string
    price: number
    billingPeriod: string
    features: string[]
    /** Durées choisissables en mois (ex. [1,3,6,12]) ; absent/null = fixe à 1 mois. */
    availablePeriods?: number[] | null
}

const PERIOD_LABELS: Record<number, string> = {
    1: "1 mois",
    3: "3 mois",
    6: "6 mois",
    12: "12 mois",
}

/**
 * Forfait mis en avant. On cible le premier forfait payant mensuel (« Business »),
 * qui joue le rôle de plan standard entre l'offre gratuite et l'annuel.
 */
function findPopularPlanId(plans: Plan[]): string | null {
    const paidMonthly = plans.filter((p) => Number(p.price) > 0 && p.billingPeriod === "MONTHLY")
    if (paidMonthly.length > 0) return paidMonthly[0].id
    const paid = plans.filter((p) => Number(p.price) > 0)
    return paid.length > 0 ? paid[0].id : null
}

/** Gratuit d'abord, puis du moins cher au plus cher. */
function sortPlans(plans: Plan[]): Plan[] {
    return [...plans].sort((a, b) => Number(a.price) - Number(b.price))
}

export default function ChoosePlanPage() {
    const router = useRouter()
    const { data: session, status: sessionStatus } = useSession()

    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [subscribing, setSubscribing] = useState<string | null>(null)
    const [loadError, setLoadError] = useState(false)
    const [phone, setPhone] = useState("")
    // Durée choisie par plan (clé = plan.id) — seuls les plans avec
    // `availablePeriods` (Business, Business+) affichent le sélecteur ;
    // les autres restent implicitement à 1 mois.
    const [periodByPlan, setPeriodByPlan] = useState<Record<string, number>>({})
    const periodFor = (plan: Plan) => periodByPlan[plan.id] ?? plan.availablePeriods?.[0] ?? 1

    // Une entreprise déjà connectée qui consulte les forfaits n'est PAS en
    // train de s'inscrire : elle ne doit pas finir sur la page de félicitations.
    // Le parcours d'inscription, lui, est marqué en sessionStorage juste après
    // la vérification OTP (voir lib/signup-flow.ts).
    const [signupFlow, setSignupFlow] = useState(false)
    useEffect(() => setSignupFlow(isInSignupFlow()), [])

    useEffect(() => {
        subscriptionService
            .getPlans("ENTREPRISE")
            .then((res) => {
                const data = (res as any)?.data ?? res ?? []
                setPlans(Array.isArray(data) ? data : [])
            })
            .catch((err) => {
                console.error("[signup/plan] getPlans error:", err)
                setLoadError(true)
                toast.error("Impossible de charger les forfaits disponibles.")
            })
            .finally(() => setLoading(false))
    }, [])

    const sortedPlans = useMemo(() => sortPlans(plans), [plans])
    const popularPlanId = useMemo(() => findPopularPlanId(sortedPlans), [sortedPlans])

    /** userId utilisable : session établie, ou celui capturé à l'inscription. */
    const resolveUserId = () => session?.user?.id ?? getSignupUserId()

    /** Où repartir quand aucune action n'a abouti (pas de félicitations). */
    const exitWithoutSubscribing = () => {
        clearSignupFlow()
        router.push(sessionStatus === "authenticated" ? "/dashboard" : "/auth/signin")
    }

    /** Où atterrir après une souscription réellement aboutie. */
    const goToSuccess = () => {
        completeSignupFlow()
        router.push("/auth/signup/success")
    }

    const handleSelectFreePlan = async (plan: Plan) => {
        const userId = resolveUserId()
        if (!userId) {
            toast.error("Connectez-vous pour activer l'offre gratuite.")
            router.push("/auth/signin")
            return
        }

        setSubscribing(plan.id)
        try {
            // Activation sans paiement : le backend n'accepte cet endpoint que
            // pour les plans à 0 (voir SubscriptionService::subscribe).
            await subscriptionService.subscribe({ userId, planId: plan.id })
            toast.success("Offre gratuite activée. Bon test !")

            if (signupFlow) {
                goToSuccess()
                return
            }
            // Simple changement d'offre depuis l'app : on retourne dans l'espace.
            clearSignupFlow()
            router.push("/dashboard")
        } catch (error: any) {
            toast.error(
                extractApiErrorMessage(error, "Impossible d'activer l'offre gratuite pour le moment.")
            )
        } finally {
            setSubscribing(null)
        }
    }

    const handleSelectPaidPlan = async (plan: Plan) => {
        const userId = resolveUserId()
        if (!userId) {
            toast.error("Connectez-vous pour souscrire à un forfait.")
            router.push("/auth/signin")
            return
        }
        if (!telephoneValide(phone)) {
            toast.error("Renseignez un numéro de téléphone complet pour payer via Paiement Pro.")
            return
        }

        setSubscribing(plan.id)
        try {
            // Le retour de paiement doit savoir si l'on finalise une inscription
            // ou si l'on change simplement d'offre - d'où `flow` dans l'URL.
            const origin = window.location.origin
            const flow = signupFlow ? "signup" : "upgrade"
            const periodMonths = periodFor(plan)
            const res = await subscriptionService.createCheckout({
                userId,
                planId: plan.id,
                gateway: "paiementpro",
                customerPhone: phone.trim(),
                periodMonths,
                successUrl: `${origin}/auth/payment-success?userId=${userId}&planId=${plan.id}&gateway=paiementpro&flow=${flow}`,
                errorUrl: `${origin}/auth/payment-error?planId=${plan.id}&flow=${flow}`,
            })
            const data = (res as any)?.data ?? res
            if (!data?.checkoutUrl) throw new Error("checkoutUrl manquante")

            // La redirection externe fait perdre l'état React : on réécrit le
            // marqueur de parcours pour que le retour de paiement le retrouve.
            if (signupFlow) beginSignupFlow(userId)

            window.location.href = data.checkoutUrl
        } catch (error: any) {
            toast.error(
                extractApiErrorMessage(
                    error,
                    "Erreur lors de l'initialisation du paiement. Vous pourrez vous abonner depuis vos paramètres."
                )
            )
            setSubscribing(null)
        }
    }

    const handleSelectPlan = (plan: Plan) =>
        Number(plan.price) === 0 ? handleSelectFreePlan(plan) : handleSelectPaidPlan(plan)

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-[#2447FF]" />
            </div>
        )
    }

    if (loadError && sortedPlans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="mb-4 text-sm text-destructive">
                    Impossible de charger les forfaits disponibles pour le moment.
                </p>
                <button
                    onClick={exitWithoutSubscribing}
                    className="rounded-full px-4 py-2 text-sm text-[#5B6472] underline underline-offset-4 transition-colors hover:text-[#0B1220] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2447FF]/40"
                >
                    Passer cette étape
                </button>
            </div>
        )
    }

    const hasPaidPlan = sortedPlans.some((p) => Number(p.price) > 0)

    return (
        <div className="w-full py-8 sm:py-12">
            {/* En-tête */}
            <div className="mx-auto max-w-2xl px-4 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF6B4A]">
                    {signupFlow ? "Dernière étape" : "Vos forfaits"}
                </p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#0B1220] sm:text-3xl">
                    Choisissez votre formule
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#5B6472]">
                    Commencez gratuitement pour tester l&apos;espace recrutement, ou passez directement à un
                    forfait complet - réglable en Mobile Money.
                </p>
            </div>

            {/* Téléphone : requis uniquement pour un forfait payant */}
            {hasPaidPlan && (
                <div className="mx-auto mt-8 max-w-sm px-4">
                    <label
                        htmlFor="paiementpro-phone"
                        className="mb-1.5 block text-xs font-medium text-[#5B6472]"
                    >
                        Numéro Mobile Money (pour les forfaits payants)
                    </label>
                    {/* Même composant que l'inscription et le profil : l'indicatif
                        est choisi, pas tapé - Paiement Pro reçoit ainsi un numéro
                        au format attendu quel que soit le pays. */}
                    <PhoneInput
                        id="paiementpro-phone"
                        value={phone}
                        onChange={setPhone}
                        placeholder="07 00 00 00 00"
                    />
                </div>
            )}

            {/* Forfaits : pleine largeur, centrés, cards bornées.
                flex-wrap plutôt qu'une grille - avec 3 offres sur 2 colonnes
                (tablette), une grille laisserait la 3e collée à gauche. */}
            <div className="mx-auto mt-10 flex w-full max-w-[1100px] flex-wrap items-stretch justify-center gap-6 px-4">
                {sortedPlans.map((plan) => {
                    const isFree = Number(plan.price) === 0
                    const isPopular = plan.id === popularPlanId
                    const isBusy = subscribing === plan.id

                    return (
                        <div
                            key={plan.id}
                            className={`relative flex w-full max-w-sm flex-col rounded-md bg-white transition-shadow sm:w-[calc(50%-0.75rem)] lg:w-[330px] ${
                                isPopular
                                    ? "border-2 border-[#2447FF] shadow-[0_18px_45px_-25px_rgba(36,71,255,0.55)]"
                                    : "border border-black/[0.08] shadow-sm hover:shadow-md"
                            }`}
                        >
                            {isPopular && (
                                <span className="absolute -top-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-[#2447FF] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white shadow-md">
                                    <Star className="h-3 w-3" fill="currentColor" />
                                    Choix populaire
                                </span>
                            )}

                            <div className="flex flex-1 flex-col p-6">
                                <div className="flex items-center gap-2">
                                    {isFree ? (
                                        <Gift className="h-4 w-4 text-[#16a34a]" />
                                    ) : (
                                        <Sparkles className="h-4 w-4 text-[#2447FF]" />
                                    )}
                                    <h2 className="text-base font-semibold text-[#0B1220]">{plan.name}</h2>
                                </div>

                                <p className="mt-1 text-xs text-[#5B6472]">
                                    {isFree
                                        ? "Pour tester l'essentiel sans payer"
                                        : plan.name === "Business+"
                                          ? "Pour les grandes entreprises"
                                          : "Pour les entreprises en croissance"}
                                </p>

                                {!isFree && plan.availablePeriods && plan.availablePeriods.length > 1 && (
                                    <div className="mt-4 flex flex-wrap gap-1.5">
                                        {plan.availablePeriods.map((months) => (
                                            <button
                                                key={months}
                                                type="button"
                                                onClick={() =>
                                                    setPeriodByPlan((prev) => ({ ...prev, [plan.id]: months }))
                                                }
                                                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                                    periodFor(plan) === months
                                                        ? "border-[#2447FF] bg-[#2447FF]/10 text-[#2447FF]"
                                                        : "border-black/10 text-[#5B6472] hover:border-black/20"
                                                }`}
                                            >
                                                {PERIOD_LABELS[months] ?? `${months} mois`}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-5 flex items-baseline gap-1.5">
                                    <span className="text-3xl font-semibold tracking-tight text-[#0B1220]">
                                        {isFree ? "0" : (Number(plan.price) * periodFor(plan)).toLocaleString("fr-FR")}
                                    </span>
                                    <span className="text-xs font-medium text-[#5B6472]">
                                        FCFA / {periodFor(plan) > 1 ? `${periodFor(plan)} mois` : "mois"}
                                    </span>
                                </div>

                                <Button
                                    onClick={() => handleSelectPlan(plan)}
                                    disabled={isBusy || subscribing !== null}
                                    className={`mt-5 w-full rounded-full text-sm font-semibold ${
                                        isPopular
                                            ? "bg-[#2447FF] text-white hover:bg-[#1d3ce0]"
                                            : isFree
                                              ? "bg-[#1e7df2] text-white hover:bg-[#1668d6]"
                                              : "border border-black/10 bg-white text-[#0B1220] hover:bg-[#F7F8FC]"
                                    }`}
                                >
                                    {isBusy ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : isFree ? (
                                        "Activer gratuitement"
                                    ) : (
                                        "Choisir ce forfait"
                                    )}
                                </Button>

                                {isFree ? (
                                    // "Offre gratuite" n'est pas dans la grille Business/Business+/Sur
                                    // Mesure du PDF (c'est un 4ᵉ palier propre à l'app) : elle garde sa
                                    // propre liste de fonctionnalités renvoyée par l'API.
                                    <ul className="mt-6 space-y-2.5 border-t border-black/[0.06] pt-5">
                                        {(plan.features ?? []).map((feature, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-2 text-[13px] leading-snug text-[#5B6472]"
                                            >
                                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16a34a]" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <PlanFeatureList
                                        planName={plan.name}
                                        className="mt-6 space-y-2.5 border-t border-black/[0.06] pt-5"
                                    />
                                )}

                                {isFree && (
                                    <p className="mt-4 rounded-lg bg-[#F7F8FC] p-3 text-[11px] leading-relaxed text-[#5B6472]">
                                        Services RH inclus. Goriya Meet et intégrations API restent réservés
                                        aux forfaits payants.
                                    </p>
                                )}
                            </div>
                        </div>
                    )
                })}
                {/* Pas un SubscriptionPlan sélectionnable : le CTA ouvre le choix
                    du canal de contact plutôt qu'une souscription/checkout. */}
                <CustomPlanCard />
            </div>

            <div className="mt-10 text-center">
                <button
                    onClick={exitWithoutSubscribing}
                    className="rounded-full px-4 py-2 text-sm text-[#5B6472] underline underline-offset-4 transition-colors hover:text-[#0B1220] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2447FF]/40"
                >
                    {signupFlow ? "Décider plus tard" : "Retour à mon espace"}
                </button>
            </div>
        </div>
    )
}
