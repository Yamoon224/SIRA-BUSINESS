"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
    ArrowRight,
    BadgeCheck,
    Check,
    LayoutDashboard,
    Loader2,
    Send,
    UserCircle2,
} from "lucide-react"
import { clearSignupFlow, hasCompletedSignupFlow } from "@/lib/signup-flow"

/** Prochaines actions concrètes, à la place d'un simple « profil complet ». */
const nextSteps = [
    {
        icon: Send,
        title: "Publiez votre première offre",
        description: "Décrivez le poste, Goriya se charge du scoring des candidatures.",
        href: "/poster-offre",
    },
    {
        icon: UserCircle2,
        title: "Complétez votre profil entreprise",
        description: "Logo, galerie et présentation : les candidats les consultent avant de postuler.",
        href: "/profil",
    },
    {
        icon: LayoutDashboard,
        title: "Explorez votre tableau de bord",
        description: "Suivez vos annonces, vos candidatures et vos entretiens au même endroit.",
        href: "/dashboard",
    },
]

export default function SignupSuccessPage() {
    const router = useRouter()
    const { status } = useSession()

    // Cette page ne se justifie qu'après une action réellement aboutie
    // (inscription terminée, abonnement ou offre gratuite activés). Une
    // entreprise qui arrive ici par un lien direct ou en consultant les
    // forfaits repart vers son espace - voir lib/signup-flow.ts.
    const [allowed, setAllowed] = useState<boolean | null>(null)

    useEffect(() => {
        if (status === "loading") return

        if (hasCompletedSignupFlow()) {
            setAllowed(true)
            return
        }

        setAllowed(false)
        router.replace(status === "authenticated" ? "/dashboard" : "/auth/signin")
    }, [status, router])

    if (allowed !== true) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-[#2447FF]" />
            </div>
        )
    }

    return (
        <div className="mx-auto w-full max-w-xl py-6 sm:py-10">
            <div className="overflow-hidden rounded-md border border-black/[0.08] bg-white shadow-sm">
                {/* En-tête de confirmation */}
                <div className="flex flex-col items-center border-b border-black/[0.06] px-6 py-8 text-center sm:px-8">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F5EC]">
                        <Check className="h-6 w-6 stroke-[2.5] text-[#16a34a]" />
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5EC] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#15803d]">
                        <BadgeCheck className="h-3 w-3" />
                        Compte activé
                    </div>

                    <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#0B1220] sm:text-2xl">
                        Votre espace entreprise est prêt
                    </h1>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#5B6472]">
                        Bienvenue sur Goriya. Vous pouvez dès maintenant publier une offre et recevoir des
                        candidatures analysées automatiquement.
                    </p>
                </div>

                {/* Prochaines étapes */}
                <div className="px-6 py-6 sm:px-8">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8891ab]">
                        Pour bien démarrer
                    </p>

                    <ul className="space-y-1">
                        {nextSteps.map(({ icon: Icon, title, description, href }) => (
                            <li key={href}>
                                <Link
                                    href={href}
                                    onClick={clearSignupFlow}
                                    className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-[#F7F8FC] focus-visible:bg-[#F7F8FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2447FF]/40"
                                >
                                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF3FF]">
                                        <Icon className="h-4 w-4 text-[#2447FF]" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-[#0B1220]">{title}</span>
                                        <span className="mt-0.5 block text-xs leading-relaxed text-[#5B6472]">
                                            {description}
                                        </span>
                                    </span>
                                    <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-[#b6bdcd] transition-transform group-hover:translate-x-0.5 group-hover:text-[#2447FF]" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* CTA */}
                <div className="flex flex-col gap-2.5 border-t border-black/[0.06] bg-[#F7F8FC] px-6 py-5 sm:flex-row sm:px-8">
                    <Button
                        asChild
                        className="h-10 flex-1 rounded-full bg-[#1e7df2] text-sm font-semibold text-white hover:bg-[#1668d6]"
                    >
                        <Link href="/poster-offre" onClick={clearSignupFlow}>
                            Poster une offre
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        className="h-10 flex-1 rounded-full border-black/10 bg-white text-sm font-semibold text-[#0B1220]"
                    >
                        <Link href="/dashboard" onClick={clearSignupFlow}>
                            Aller au tableau de bord
                        </Link>
                    </Button>
                </div>
            </div>

            <p className="mt-5 text-center text-xs text-[#8891ab]">
                Une question ?{" "}
                <Link
                    href="/assistance"
                    className="font-medium text-[#2447FF] underline underline-offset-2 hover:text-[#1d3ce0]"
                >
                    Contactez le centre d&apos;assistance
                </Link>
            </p>
        </div>
    )
}
