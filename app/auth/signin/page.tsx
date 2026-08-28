// app/auth/signin/page.tsx
"use client"

import Link from "next/link"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { getSession, signIn, signOut } from "next-auth/react"

export default function Page() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [showPassword, setShowPassword] = useState(false)

    // ✅ La session NextAuth (cookie httpOnly) est l'unique source de vérité.
    // Si une session valide existe déjà, on redirige directement vers le dashboard.
    useEffect(() => {
        getSession().then((session) => {
            if (session?.user) {
                router.replace("/dashboard")
            }
        })
    }, [router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            // 🔥 Récupérer la session
            const session = await getSession()

            if (res?.error) {
                throw new Error("Email ou mot de passe incorrect")
            }

            if (session?.user) {
                const role = (session.user as any).role
                if (role !== "ENTREPRISE") {
                    await signOut({ redirect: false })
                    toast.error("Votre compte n'est pas autorisé ici. Cette interface est réservée aux entreprises.")
                    return
                }
            }

            // ✅ signIn() a déjà posé le cookie de session NextAuth (httpOnly).
            // On ne duplique plus le token en localStorage/cookie non protégé.
            // router.refresh() force le SessionProvider fraîchement monté dans
            // (protected)/layout.tsx à revalider immédiatement plutôt que de
            // dépendre uniquement de son fetch initial (même correctif que
            // standard/app/auth/signin/page.tsx).
            toast.success("Connexion réussie")
            router.replace("/dashboard")
            router.refresh()

        } catch (err: any) {
            toast.error(err.message)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mx-auto mt-6 w-full max-w-md rounded-3xl border border-black/[0.06] bg-white p-8 shadow-[0_20px_60px_-30px_rgba(11,18,32,0.25)] sm:p-10">
            <h2 className="text-center text-3xl text-[#0B1220]">Bon retour.</h2>
            <p className="mt-2 text-center text-sm text-[#5B6472]">Connectez-vous à votre espace entreprise.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-3">
                <FieldGroup>
                    <Field>
                        <FieldLabel>Email</FieldLabel>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Votre email"
                            required
                            className="h-11 rounded-xl focus-visible:ring-[#2447FF]/30"
                        />
                    </Field>

                    <Field>
                        <FieldLabel>Mot de passe</FieldLabel>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Votre mot de passe"
                                required
                                className="h-11 rounded-xl pr-10 focus-visible:ring-[#2447FF]/30"
                            />

                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6472] hover:text-[#0B1220]">
                                {showPassword ? (<EyeOff className="h-4 w-4" />) : (<Eye className="h-4 w-4" />)}
                            </button>
                        </div>
                    </Field>
                </FieldGroup>

                <Button
                    type="submit"
                    className="w-full rounded-full bg-[#0B1220] transition-transform duration-200 hover:scale-[1.01] hover:bg-[#0B1220]/90"
                    disabled={loading}
                >
                    {loading ? "Connexion..." : "Se connecter"}
                </Button>
            </form>

            <div className="mt-6 text-center text-sm text-[#5B6472]">
                Vous n&apos;avez pas de compte entreprise ?{" "}
                <Link
                    href="/auth/signup"
                    className="font-semibold text-[#2447FF] hover:underline">
                    S&apos;inscrire
                </Link>
            </div>
        </div>
    )
}