"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { subscriptionService } from "@/lib/api/subscription.service"
import { extractApiErrorMessage } from "@/lib/api-error"
import {
    clearSignupFlow,
    completeSignupFlow,
    getSignupUserId,
    isInSignupFlow,
} from "@/lib/signup-flow"

type State = "loading" | "success" | "error"

function PaymentSuccessContent() {
    const router = useRouter()
    const params = useSearchParams()
    const [state, setState] = useState<State>("loading")
    const [errorMsg, setErrorMsg] = useState("")
    // "Réessayer" relance la vérification du MÊME paiement — renvoyer vers la
    // page des forfaits ferait payer une seconde fois.
    const [retryKey, setRetryKey] = useState(0)

    // Un paiement peut finaliser une inscription OU un simple changement
    // d'offre depuis l'espace entreprise : seul le premier cas justifie la page
    // de félicitations. `flow=signup` est posé par la page des forfaits ; on
    // retombe sur le marqueur de session s'il a été perdu en route.
    const isSignupFlow = params.get("flow") === "signup" || isInSignupFlow()
    const doneHref = isSignupFlow ? "/auth/signup/success" : "/dashboard"

    useEffect(() => {
        const userId = params.get("userId") || getSignupUserId()
        const planId = params.get("planId")
        const gateway = params.get("gateway") ?? undefined
        // Si Paiement Pro accole ses propres paramètres au returnURL avec un
        // "?" de trop, `ref` (dernier paramètre) arrive pollué : on le nettoie
        // et on retombe sur le `referenceNumber` qu'il renvoie.
        const transactionId = gateway === "paiementpro"
            ? (params.get("ref")?.split("?")[0] || params.get("referenceNumber"))
            : sessionStorage.getItem("kkiapay_transaction_id")

        if (!userId || !planId || !transactionId) {
            setErrorMsg("Paramètres de paiement introuvables.")
            setState("error")
            return
        }

        let cancelled = false
        // Paiement Pro confirme via une notification serveur-à-serveur qui peut
        // arriver après le retour du navigateur - on re-tente quelques fois.
        // (~1 min ; l'abonnement s'active de toute façon à la notification.)
        const maxAttempts = gateway === "paiementpro" ? 20 : 1
        setState("loading")

        const attempt = (n: number) => {
            subscriptionService.verifyCheckout(transactionId, userId, planId, gateway)
                .then(() => {
                    if (cancelled) return
                    sessionStorage.removeItem("kkiapay_transaction_id")
                    // Un paiement confirmé est une action réellement aboutie :
                    // on n'ouvre la page de félicitations que si l'on finalisait
                    // une inscription.
                    if (isSignupFlow) {
                        completeSignupFlow()
                    } else {
                        clearSignupFlow()
                    }
                    setState("success")
                })
                .catch((err: any) => {
                    if (cancelled) return
                    if (n < maxAttempts) {
                        setTimeout(() => attempt(n + 1), 3000)
                        return
                    }
                    const msg = gateway === "paiementpro"
                        ? "Votre paiement n'est pas encore confirmé. S'il a été débité, ne payez pas une seconde fois : votre abonnement s'activera dès la confirmation."
                        : extractApiErrorMessage(err, "Paiement non confirmé.")
                    setErrorMsg(msg)
                    setState("error")
                })
        }
        attempt(1)

        return () => { cancelled = true }
    }, [params, isSignupFlow, retryKey])

    useEffect(() => {
        if (state === "success") {
            const t = setTimeout(() => router.push(doneHref), 3000)
            return () => clearTimeout(t)
        }
    }, [state, router, doneHref])

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
                            {isSignupFlow
                                ? "Votre abonnement est actif. Finalisation de l'inscription…"
                                : "Votre nouvelle offre est active. Retour à votre espace…"}
                        </p>
                    </div>
                    <Button
                        onClick={() => router.push(doneHref)}
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
                        <Button variant="outline" onClick={() => setRetryKey((k) => k + 1)}>
                            Réessayer
                        </Button>
                        <Button
                            onClick={() => {
                                // Aucun abonnement activé : ce n'est pas une action
                                // aboutie - on ouvre l'espace entreprise, pas la
                                // page de félicitations.
                                clearSignupFlow()
                                router.push("/dashboard")
                            }}
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
