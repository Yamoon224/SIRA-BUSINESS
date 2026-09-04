// app/auth/signin/page.tsx
"use client"

import Link from "next/link"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { getSession, signIn, signOut } from "next-auth/react"
import { initializeGoogleAuth, signInWithGoogle, GOOGLE_CLIENT_ID } from "@/lib/google-auth"

/**
 * Destination post-connexion : on honore `callbackUrl` (posé par proxy.ts et
 * par les pages protégées, ex. /profil) pour renvoyer l'utilisateur là où il
 * allait, au lieu de le déposer systématiquement sur le tableau de bord.
 * Seuls les chemins internes sont acceptés - jamais une URL absolue, qui
 * ouvrirait une redirection non contrôlée.
 */
function safeCallbackUrl(raw: string | null): string {
    if (!raw) return "/dashboard"
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard"
    // On ne renvoie pas vers les pages d'authentification elles-mêmes.
    if (raw.startsWith("/auth")) return "/dashboard"
    return raw
}

function SignInForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"))
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [error, setError] = useState("")
    const [showPassword, setShowPassword] = useState(false)

    // ✅ La session NextAuth (cookie httpOnly) est l'unique source de vérité.
    // Si une session valide existe déjà, on redirige directement vers le dashboard.
    useEffect(() => {
        getSession().then((session) => {
            if (session?.user) {
                router.replace(callbackUrl)
            }
        })
    }, [router, callbackUrl])

    useEffect(() => {
        initializeGoogleAuth().catch((e) => console.error("[signin] init Google:", e))
    }, [])

    const finishSession = async () => {
        const session = await getSession()
        const role = (session?.user as any)?.role
        if (session?.user && role && role !== "ENTREPRISE") {
            await signOut({ redirect: false })
            toast.error("Votre compte n'est pas autorisé ici. Cette interface est réservée aux entreprises.")
            return
        }
        toast.success("Connexion réussie")
        router.replace(callbackUrl)
        router.refresh()
    }

    const handleGoogle = async () => {
        setError("")
        setGoogleLoading(true)
        try {
            const credential = await signInWithGoogle()
            const res = await signIn("google", { credential, redirect: false })
            if (res?.error) {
                throw new Error("Aucun compte entreprise n'est associé à cette adresse Google. Utilisez l'e-mail de votre compte ou inscrivez-vous.")
            }
            await finishSession()
        } catch (err: any) {
            const msg = String(err?.message ?? "")
            if (!msg.includes("annulée") && !msg.includes("indisponible")) {
                setError(msg || "Échec de la connexion avec Google.")
                toast.error(msg || "Échec de la connexion avec Google.")
            }
        } finally {
            setGoogleLoading(false)
        }
    }

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
            router.replace(callbackUrl)
            router.refresh()

        } catch (err: any) {
            toast.error(err.message)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mx-auto mt-6 w-full max-w-md rounded-md border border-black/[0.06] bg-white p-8 shadow-[0_20px_60px_-30px_rgba(11,18,32,0.25)] sm:p-10">
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

                {error && (
                    <p className="text-center text-sm text-red-600" role="alert">{error}</p>
                )}

                <Button
                    type="submit"
                    className="w-full rounded-full bg-[#1e7df2] transition-transform duration-200 hover:scale-[1.01] hover:bg-[#1668d6]"
                    disabled={loading}
                >
                    {loading ? "Connexion..." : "Se connecter"}
                </Button>
            </form>

            {GOOGLE_CLIENT_ID && (
                <>
                    <div className="my-5 flex items-center gap-3 text-xs text-[#8A93A2]">
                        <span className="h-px flex-1 bg-black/10" />
                        ou
                        <span className="h-px flex-1 bg-black/10" />
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleGoogle}
                        disabled={googleLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-full border-black/10 bg-white hover:bg-black/[0.03]"
                    >
                        {googleLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        Se connecter avec Google
                    </Button>
                </>
            )}

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

/**
 * useSearchParams impose une frontière Suspense côté App Router : sans elle,
 * le build échoue sur cette page (« should be wrapped in a suspense boundary »).
 */
export default function Page() {
    return (
        <Suspense
            fallback={
                <div className="mx-auto mt-6 flex w-full max-w-md items-center justify-center rounded-md border border-black/[0.06] bg-white p-16 shadow-[0_20px_60px_-30px_rgba(11,18,32,0.25)]">
                    <Loader2 className="h-6 w-6 animate-spin text-[#2447FF]" />
                </div>
            }
        >
            <SignInForm />
        </Suspense>
    )
}
