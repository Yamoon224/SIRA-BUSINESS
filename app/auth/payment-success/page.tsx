"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { subscriptionService } from "@/lib/api/subscription.service"

type State = "loading" | "success" | "error"

function PaymentSuccessContent() {
    const router = useRouter()
    const params = useSearchParams()
    const [state, setState] = useState<State>("loading")
    const [errorMsg, setErrorMsg] = useState("")

    useEffect(() => {
        const userId = params.get("userId") || sessionStorage.getItem("entreprise_signup_userId")
        const planId = params.get("planId")
        const gateway = params.get("gateway") ?? undefined
        const transactionId = gateway === "paiementpro"
            ? params.get("ref")
            : sessionStorage.getItem("kkiapay_transaction_id")

        if (!userId || !planId || !transactionId) {
            setErrorMsg("Paramètres de paiement introuvables.")
            setState("error")
            return
        }

        let cancelled = false
        // Paiement Pro confirme via une notification serveur-à-serveur qui peut
        // arriver après le retour du navigateur — on re-tente quelques fois.
        const maxAttempts = gateway === "paiementpro" ? 5 : 1

        const attempt = (n: number) => {
            subscriptionService.verifyCheckout(transactionId, userId, planId, gateway)
                .then(() => {
                    if (cancelled) return
                    sessionStorage.removeItem("kkiapay_transaction_id")
                    sessionStorage.removeItem("entreprise_signup_userId")
                    setState("success")
                })
                .catch((err: any) => {
                    if (cancelled) return
                    if (n < maxAttempts) {
                        setTimeout(() => attempt(n + 1), 3000)
                        return
                    }
                    const msg = gateway === "paiementpro"
                        ? "Paiement en cours de confirmation. Réessayez dans un instant."
                        : err?.response?.data?.message ?? err?.message ?? "Paiement non confirmé."
                    setErrorMsg(msg)
                    setState("error")
                })
        }
        attempt(1)

        return () => { cancelled = true }
    }, [params])

    useEffect(() => {
        if (state === "success") {
            const t = setTimeout(() => router.push("/auth/signup/success"), 3000)
            return () => clearTimeout(t)
        }
    }, [state, router])

    return (
        <div className="w-full max-w-md text-center space-y-6">
            {state === "loading" && (
                <>
                    <Loader2 className="mx-auto h-16 w-16 animate-spin text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Vérification du paiement…</h1>
                        <p className="text-muted-foreground text-sm mt-1">Merci de patienter quelques instants.</p>
                    </div>
                </>
            )}

            {state === "success" && (
                <>
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Paiement réussi !</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Votre abonnement est actif. Finalisation de l'inscription…
                        </p>
                    </div>
                    <Button
                        onClick={() => router.push("/auth/signup/success")}
                        className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-8"
                    >
                        Continuer
                    </Button>
                </>
            )}

            {state === "error" && (
                <>
                    <XCircle className="mx-auto h-16 w-16 text-red-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Activation échouée</h1>
                        <p className="text-muted-foreground text-sm mt-1">{errorMsg}</p>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <Button variant="outline" onClick={() => router.push("/auth/signup/plan")}>
                            Réessayer
                        </Button>
                        <Button
                            onClick={() => router.push("/auth/signup/success")}
                            className="bg-blue-600 text-white"
                        >
                            Continuer sans abonnement
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}

export default function PaymentSuccessPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
            <Suspense
                fallback={
                    <div className="w-full max-w-md text-center space-y-6">
                        <Loader2 className="mx-auto h-16 w-16 animate-spin text-blue-600" />
                        <h1 className="text-2xl font-bold text-foreground">Chargement…</h1>
                    </div>
                }
            >
                <PaymentSuccessContent />
            </Suspense>
        </div>
    )
}
