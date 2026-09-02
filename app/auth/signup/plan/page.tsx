"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { subscriptionService } from "@/lib/api/subscription.service"
import { toast } from "sonner"

interface Plan {
    id: string
    name: string
    price: number
    billingPeriod: string
    features: string[]
}

export default function ChoosePlanPage() {
    const router = useRouter()
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [subscribing, setSubscribing] = useState<string | null>(null)
    const [loadError, setLoadError] = useState(false)
    const [phone, setPhone] = useState("")

    useEffect(() => {
        subscriptionService.getPlans("ENTREPRISE")
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

    const handleSelectPlan = async (planId: string) => {
        const userId = sessionStorage.getItem("entreprise_signup_userId")
        if (!userId) {
            router.push("/auth/signup/success")
            return
        }
        if (phone.trim().length < 8) {
            toast.error("Renseignez un numéro de téléphone pour payer via Paiement Pro.")
            return
        }
        setSubscribing(planId)
        try {
            // Paiement Pro en session hébergée : on redirige le navigateur vers
            // la page de paiement. C'est l'unique moyen de paiement proposé.
            const origin = window.location.origin
            const res = await subscriptionService.createCheckout({
                userId,
                planId,
                gateway: "paiementpro",
                customerPhone: phone.trim(),
                successUrl: `${origin}/auth/payment-success?userId=${userId}&planId=${planId}&gateway=paiementpro`,
                errorUrl: `${origin}/auth/payment-error?planId=${planId}`,
            })
            const data = (res as any)?.data ?? res
            if (!data?.checkoutUrl) throw new Error("checkoutUrl manquante")
            window.location.href = data.checkoutUrl
        } catch {
            toast.error("Erreur lors de l'initialisation du paiement. Vous pourrez vous abonner depuis vos paramètres.")
            sessionStorage.removeItem("entreprise_signup_userId")
            router.push("/auth/signup/success")
            setSubscribing(null)
        }
    }

    const handleSkip = () => {
        sessionStorage.removeItem("entreprise_signup_userId")
        router.push("/auth/signup/success")
    }

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
        )
    }

    if (loadError && plans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="mb-4 text-sm text-destructive">
                    Impossible de charger les forfaits disponibles pour le moment.
                </p>
                <button onClick={handleSkip} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                    Passer cette étape
                </button>
            </div>
        )
    }

    const business = plans.find((p) => p.billingPeriod === "MONTHLY")
    const businessPlus = plans.find((p) => p.billingPeriod === "ANNUAL")

    return (
        <div className="py-4 sm:py-6">
            <h1 className="mb-2 text-center text-2xl font-black text-foreground sm:text-4xl">
                Choisissez votre forfait
            </h1>

            <p className="mb-8 text-center text-base tracking-[0.4em] text-muted-foreground sm:mb-10">
                + + +
            </p>

            <div className="mx-auto mb-8 max-w-md">
                <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Numéro de téléphone (Mobile Money)"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-blue-600"
                />
            </div>

            <div className="flex flex-col items-stretch justify-center gap-4 lg:flex-row lg:items-start">
                {/* Business (monthly) */}
                {business && (
                    <div className="relative w-full max-w-[360px] self-center lg:w-[280px] lg:max-w-none">
                        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                            <span className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-1 text-xs text-gray-500 shadow-sm">
                                Plan populaire
                            </span>
                        </div>

                        <div className="rounded-2xl bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-600 p-[3px] shadow-xl">
                            <div className="overflow-hidden rounded-2xl bg-white">
                                <div className="p-5">
                                    <div className="mb-2 text-3xl">🔥</div>
                                    <h3 className="text-[22px] font-bold text-foreground">{business.name}</h3>
                                    <p className="mb-4 text-[11px] text-muted-foreground">
                                        Pour les entreprises en croissance
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            onClick={() => handleSelectPlan(business.id)}
                                            disabled={subscribing === business.id}
                                            className="rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
                                        >
                                            {subscribing === business.id ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            ) : "Opter pour ça"}
                                        </Button>
                                        <div className="leading-tight">
                                            <div className="flex items-baseline gap-0.5">
                                                <span className="text-lg font-bold text-foreground">
                                                    {Number(business.price).toLocaleString("fr-FR")}
                                                </span>
                                                <span className="ml-0.5 text-[10px] font-semibold text-muted-foreground">FCFA</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">Mensuel</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-5 py-4">
                                    <ul className="space-y-2">
                                        {business.features.map((f, i) => (
                                            <li key={i} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                                                <Check className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Business+ (annual) */}
                {businessPlus && (
                    <div className="w-full max-w-[360px] self-center lg:mt-7 lg:w-[260px] lg:max-w-none">
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                            <div className="p-5">
                                <div className="mb-2 text-3xl grayscale">💎</div>
                                <h3 className="text-[22px] font-bold text-blue-600">{businessPlus.name}</h3>
                                <p className="mb-4 text-[11px] text-muted-foreground">
                                    Pour les grandes entreprises
                                </p>
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={() => handleSelectPlan(businessPlus.id)}
                                        disabled={subscribing === businessPlus.id}
                                        className="rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
                                    >
                                        {subscribing === businessPlus.id ? (
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        ) : "Opter pour ça"}
                                    </Button>
                                    <div className="leading-tight">
                                        <div className="flex items-baseline gap-0.5">
                                            <span className="text-lg font-bold text-foreground">
                                                {Number(businessPlus.price).toLocaleString("fr-FR")}
                                            </span>
                                            <span className="ml-0.5 text-[10px] font-semibold text-muted-foreground">FCFA</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">Annuel</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-5 py-4">
                                <ul className="space-y-2">
                                    {businessPlus.features.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                                            <Check className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 text-center">
                <button
                    onClick={handleSkip}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                >
                    Passer cette étape
                </button>
            </div>
        </div>
    )
}
