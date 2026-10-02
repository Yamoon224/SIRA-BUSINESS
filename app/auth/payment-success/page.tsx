"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, Clock, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { subscriptionService } from "@/lib/api/subscription.service"
import { extractApiErrorMessage } from "@/lib/api-error"
import {
    clearSignupFlow,
    completeSignupFlow,
    getSignupUserId,
    isInSignupFlow,
} from "@/lib/signup-flow"

/** `pending` : toujours pas confirmé après 3 min ; `failed` : paiement refusé. */
type State = "loading" | "success" | "pending" | "failed" | "error"

function PaymentSuccessContent() {
    const router = useRouter()
    const params = useSearchParams()
    const [state, setState] = useState<State>("loading")
    const [errorMsg, setErrorMsg] = useState("")
    const [reference, setReference] = useState<string | null>(null)
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

        // Paiement Pro : la référence suffit (l'utilisateur et le plan sont
        // relus côté serveur sur la transaction).
        if (!transactionId || (gateway !== "paiementpro" && (!userId || !planId))) {
            setErrorMsg("Paramètres de paiement introuvables.")
            setState("error")
            return
        }

        let cancelled = false
        setState("loading")

        // Paiement Pro : le résultat arrive par une notification serveur-à-
        // serveur, parfois après le retour du navigateur. On interroge l'état
        // du paiement (endpoint public, par référence) toutes les 3 s pendant
        // 3 min, puis toutes les 10 s tant que la page reste ouverte : dès que
        // la confirmation tombe, l'écran passe au vert tout seul.
        if (gateway === "paiementpro") {
            setReference(transactionId)
            let timer: ReturnType<typeof setTimeout> | undefined
            let attempts = 0

            const lireStatut = async (): Promise<"PENDING" | "SUCCESS" | "FAILED" | "UNKNOWN"> => {
                try {
                    const res = await subscriptionService.checkoutStatus(transactionId)
                    const status = ((res as any)?.data ?? res)?.status
                    if (status === "SUCCESS" || status === "FAILED" || status === "UNKNOWN") return status
                    if (status === "PENDING") return "PENDING"
                    throw new Error("réponse inattendue")
                } catch {
                    // Backend pas encore à jour, coupure réseau... : on retombe
                    // sur l'ancienne vérification, qui exige d'être connecté.
                    if (!userId || !planId) return "PENDING"
                    try {
                        await subscriptionService.verifyCheckout(transactionId, userId, planId, gateway)
                        return "SUCCESS"
                    } catch {
                        return "PENDING"
                    }
                }
            }

            const tick = async () => {
                const status = await lireStatut()
                if (cancelled) return
                attempts += 1

                if (status === "SUCCESS") {
                    sessionStorage.removeItem("kkiapay_transaction_id")
                    // On n'ouvre la page de félicitations que si l'on
                    // finalisait une inscription.
                    if (isSignupFlow) completeSignupFlow()
                    else clearSignupFlow()
                    setState("success")
                    return
                }
                if (status === "UNKNOWN") {
                    setErrorMsg("Ce paiement est introuvable.")
                    setState("error")
                    return
                }
                if (status === "FAILED") setState("failed")
                else if (attempts >= 60) setState("pending")

                // Un refus peut être suivi d'un nouvel essai réussi sur la même
                // session : on continue donc de surveiller, plus lentement.
                timer = setTimeout(tick, status === "FAILED" || attempts >= 60 ? 10_000 : 3_000)
            }
            tick()

            return () => {
                cancelled = true
                if (timer) clearTimeout(timer)
            }
        }

        const maxAttempts = 1

        const attempt = (n: number) => {
            subscriptionService.verifyCheckout(transactionId, userId as string, planId as string, gateway)
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
                    setErrorMsg(extractApiErrorMessage(err, "Paiement non confirmé."))
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

            {state === "pending" && (
                <>
                    <Clock className="mx-auto h-16 w-16 text-amber-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Paiement en cours de confirmation</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            La confirmation de votre opérateur met plus de temps que prévu. Si votre compte a été débité,
                            ne payez pas une seconde fois : votre abonnement s&apos;activera automatiquement dès la
                            confirmation, même si vous fermez cette page.
                        </p>
                        {reference && (
                            <p className="text-muted-foreground text-xs mt-3 break-all">
                                Un souci ? Écrivez à support@goriya.net avec cette référence : <span className="font-medium text-foreground">{reference}</span>
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Button variant="outline" onClick={() => setRetryKey((k) => k + 1)}>
                            Vérifier maintenant
                        </Button>
                        <Button
                            onClick={() => {
                                clearSignupFlow()
                                router.push("/dashboard")
                            }}
                            className="bg-blue-600 text-white"
                        >
                            Continuer
                        </Button>
                    </div>
                </>
            )}

            {state === "failed" && (
                <>
                    <XCircle className="mx-auto h-16 w-16 text-red-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Paiement non abouti</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Votre opérateur a refusé ou annulé ce paiement : rien n&apos;a été activé. Vérifiez votre solde puis relancez le paiement.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Button variant="outline" onClick={() => router.push("/auth/signup/plan")}>
                            Relancer le paiement
                        </Button>
                        <Button
                            onClick={() => {
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
