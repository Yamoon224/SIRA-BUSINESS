"use client"

import { useRouter } from "next/navigation"
import { XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { clearSignupFlow } from "@/lib/signup-flow"

export default function PaymentErrorPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
            <div className="w-full max-w-md text-center space-y-6">
                <XCircle className="mx-auto h-16 w-16 text-red-500" />

                <div>
                    <h1 className="text-2xl font-bold text-foreground">Paiement annulé</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Votre paiement n'a pas abouti. Vous pouvez réessayer ou finaliser l'inscription sans abonnement.
                    </p>
                </div>

                <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => router.push("/auth/signup/plan")}>
                        Réessayer
                    </Button>
                    <Button
                        onClick={() => {
                            // Paiement annulé : rien n'a abouti, la page de
                            // félicitations n'a pas lieu d'être. On ouvre
                            // directement l'espace entreprise.
                            clearSignupFlow()
                            router.push("/dashboard")
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Continuer sans abonnement
                    </Button>
                </div>
            </div>
        </div>
    )
}
