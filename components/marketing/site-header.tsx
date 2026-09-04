"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GoriyaLogo } from "@/components/goriya-logo"
import { useScrolled } from "./reveal"

/**
 * Shared marketing nav: transparent with a white logo over a dark hero, then
 * solid/blurred with the colored logo once the page is scrolled. Used on the
 * homepage and the pricing page so both open the same way.
 */
export function SiteHeader({ page = "home" }: { page?: "home" | "tarification" }) {
    const scrolled = useScrolled()
    const linkClass = (extra = "") =>
        `text-sm font-medium transition-colors ${scrolled ? "text-[#5B6472] hover:text-[#0B1220]" : "text-white/80 hover:text-white"} ${extra}`

    return (
        <header
            className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
                scrolled ? "border-b border-black/[0.06] bg-[#F7F8FC]/90 backdrop-blur-md" : "border-b border-transparent bg-transparent"
            }`}
        >
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                {/* Toujours le logo dégradé : au-dessus du hero bleu, c'est la
                    pastille claire de "onDark" qui lui rend son contraste. */}
                <GoriyaLogo variant={scrolled ? "default" : "onDark"} className="transition-all duration-300" />
                <nav className="hidden md:flex items-center gap-5 lg:gap-7">
                    {page === "home" ? (
                        <>
                            <a href="#comment-ca-marche" className={linkClass()}>
                                Comment ça marche
                            </a>
                            <a href="#services-rh" className={linkClass()}>
                                Services RH
                            </a>
                            <a href="#tarification" className={linkClass()}>
                                Tarifs
                            </a>
                        </>
                    ) : (
                        <Link href="/" className={linkClass()}>
                            Accueil
                        </Link>
                    )}
                    <Link href="/auth/signin" className={linkClass()}>
                        Se connecter
                    </Link>
                    <Button
                        className={`rounded-full px-5 transition-all duration-200 hover:scale-[1.04] ${
                            scrolled ? "bg-brand-gradient text-white hover:bg-[#1668d6]" : "bg-white text-[#0B1220] hover:bg-white/90"
                        }`}
                        asChild
                    >
                        <Link href="/auth/signup">Commencer</Link>
                    </Button>
                </nav>
                <Button
                    size="sm"
                    className={`rounded-full transition-colors md:hidden ${scrolled ? "bg-brand-gradient text-white" : "bg-white text-[#0B1220]"}`}
                    asChild
                >
                    <Link href="/auth/signup">Commencer</Link>
                </Button>
            </div>
        </header>
    )
}
