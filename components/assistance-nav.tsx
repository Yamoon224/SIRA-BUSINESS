"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LayoutDashboard } from "lucide-react"

/**
 * En-tête du centre d'assistance. La page est publique, mais elle est aussi
 * atteinte depuis la barre latérale d'une entreprise connectée : lui proposer
 * « Accueil » (landing publique), « Connexion » et « Créer un compte » la
 * faisait sortir de son espace sans raison. On adapte donc les liens au
 * contexte : espace entreprise pour un compte connecté, site public sinon.
 */
export function AssistanceNav() {
    const { status } = useSession()
    const isAuthenticated = status === "authenticated"

    return (
        <header className="sticky top-0 z-50 border-b border-[#e8edf6] bg-white">
            <div className="mx-auto flex h-[64px] max-w-[1180px] items-center justify-between gap-4 px-4">
                <Link
                    href={isAuthenticated ? "/dashboard" : "/"}
                    className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6de6]/40"
                    aria-label={isAuthenticated ? "Retour au tableau de bord" : "Retour à l'accueil"}
                >
                    <Image src="/images/logo.png" alt="Goriya" width={112} height={32} className="h-8 w-auto" priority />
                </Link>

                <nav className="hidden items-center gap-8 text-[13px] font-medium text-[#7a8495] md:flex">
                    {isAuthenticated ? (
                        <>
                            <Link href="/dashboard" className="transition-colors hover:text-[#2f6de6]">
                                Tableau de bord
                            </Link>
                            <Link href="/annonces" className="transition-colors hover:text-[#2f6de6]">
                                Mes annonces
                            </Link>
                            <Link href="/assistance" className="text-[#2f6de6]" aria-current="page">
                                Centre d&apos;assistance
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/" className="transition-colors hover:text-[#2f6de6]">
                                Accueil
                            </Link>
                            <Link href="/assistance" className="text-[#2f6de6]" aria-current="page">
                                Centre d&apos;assistance
                            </Link>
                            <Link href="/auth/signup" className="transition-colors hover:text-[#2f6de6]">
                                Créer un compte
                            </Link>
                        </>
                    )}
                </nav>

                <div className="flex items-center gap-2">
                    {isAuthenticated ? (
                        <Button
                            asChild
                            className="h-8 gap-1.5 rounded-full bg-[#2157d3] px-4 text-[12px] hover:bg-[#1d4cb9]"
                        >
                            <Link href="/dashboard">
                                <LayoutDashboard className="h-3.5 w-3.5" />
                                Mon espace
                            </Link>
                        </Button>
                    ) : (
                        <>
                            <Button
                                asChild
                                variant="outline"
                                className="h-8 rounded-full border-[#b9c8ec] bg-white px-4 text-[12px] text-[#2f6de6]"
                            >
                                <Link href="/auth/signin">Connexion</Link>
                            </Button>
                            <Button
                                asChild
                                className="h-8 rounded-full bg-[#2157d3] px-4 text-[12px] hover:bg-[#1d4cb9]"
                            >
                                <Link href="https://goriya.net">Espace candidat</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}

/** Pied de page du centre d'assistance, également adapté au contexte. */
export function AssistanceFooterLinks() {
    const { status } = useSession()
    const isAuthenticated = status === "authenticated"

    return (
        <>
            <ul className="space-y-2 text-[13px] text-[#9098a7]">
                {isAuthenticated ? (
                    <>
                        <li>
                            <Link href="/dashboard" className="hover:text-white">
                                Tableau de bord
                            </Link>
                        </li>
                        <li>
                            <Link href="/annonces" className="hover:text-white">
                                Mes annonces
                            </Link>
                        </li>
                        <li>
                            <Link href="/assistance" className="hover:text-white">
                                Centre d&apos;assistance
                            </Link>
                        </li>
                    </>
                ) : (
                    <>
                        <li>
                            <Link href="/" className="hover:text-white">
                                Accueil
                            </Link>
                        </li>
                        <li>
                            <Link href="/assistance" className="hover:text-white">
                                Centre d&apos;assistance
                            </Link>
                        </li>
                        <li>
                            <Link href="/auth/signin" className="hover:text-white">
                                Connexion
                            </Link>
                        </li>
                    </>
                )}
            </ul>
        </>
    )
}

/** Boutons du bas de page, contextuels eux aussi. */
export function AssistanceFooterActions() {
    const { status } = useSession()

    if (status === "authenticated") {
        return (
            <Button asChild className="h-8 rounded-full bg-[#2f6de6] text-[12px] hover:bg-[#2458ba]">
                <Link href="/dashboard">Retour à mon espace</Link>
            </Button>
        )
    }

    return (
        <>
            <Button
                asChild
                variant="outline"
                className="h-8 rounded-full border-[#374153] bg-transparent text-[12px] text-[#d9e5ff]"
            >
                <Link href="/auth/signin">Connexion</Link>
            </Button>
            <Button asChild className="h-8 rounded-full bg-[#2f6de6] text-[12px] hover:bg-[#2458ba]">
                <Link href="https://goriya.net">Espace candidat</Link>
            </Button>
        </>
    )
}
