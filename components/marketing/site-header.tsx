"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoriyaLogo } from "@/components/goriya-logo"
import { useScrolled } from "./reveal"

/**
 * Shared marketing nav: transparent with a white logo over a dark hero, then
 * solid/blurred with the colored logo once the page is scrolled. Used on the
 * homepage and the pricing page so both open the same way.
 *
 * Sous `md`, les liens (ancres et « Se connecter ») passent dans un menu
 * déroulant : ils étaient simplement masqués, sans autre accès sur mobile.
 */
export function SiteHeader({ page = "home", forceSolid = false }: { page?: "home" | "tarification" | "legal"; forceSolid?: boolean }) {
    const scrolled = useScrolled()
    const [menuOpen, setMenuOpen] = useState(false)
    // Menu ouvert au-dessus du hero : fond clair, sinon les liens foncés seraient illisibles.
    // `forceSolid` : pages sans hero sombre sous le header (ex. pages légales) -
    // transparent + logo blanc y serait invisible sur un fond clair dès le chargement.
    const solid = forceSolid || scrolled || menuOpen

    // Repasser en largeur desktop referme le menu mobile.
    useEffect(() => {
        if (!menuOpen) return
        const onResize = () => {
            if (window.innerWidth >= 768) setMenuOpen(false)
        }
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
    }, [menuOpen])

    const links =
        page === "home"
            ? [
                  { href: "#comment-ca-marche", label: "Comment ça marche" },
                  { href: "#services-rh", label: "Services RH" },
                  { href: "#tarification", label: "Tarifs" },
              ]
            : [{ href: "/", label: "Accueil" }]

    const linkClass = `whitespace-nowrap text-sm font-medium transition-colors ${
        solid ? "text-[#5B6472] hover:text-[#0B1220]" : "text-white/80 hover:text-white"
    }`
    const mobileLinkClass = "rounded-md px-2 py-3 text-base font-medium text-[#0B1220] transition-colors hover:bg-black/[0.04]"

    const renderLink = (link: { href: string; label: string }, className: string, onClick?: () => void) =>
        link.href.startsWith("#") ? (
            <a key={link.href} href={link.href} className={className} onClick={onClick}>
                {link.label}
            </a>
        ) : (
            <Link key={link.href} href={link.href} className={className} onClick={onClick}>
                {link.label}
            </Link>
        )

    return (
        <header
            className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
                solid ? "border-b border-black/[0.06] bg-[#F7F8FC]/95 backdrop-blur-md" : "border-b border-transparent bg-transparent"
            }`}
        >
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                {/* Toujours le logo dégradé : au-dessus du hero bleu, c'est la
                    pastille claire de "onDark" qui lui rend son contraste. */}
                <GoriyaLogo variant={solid ? "default" : "onDark"} className="transition-all duration-300" />
                <nav className="hidden md:flex items-center gap-5 lg:gap-7">
                    {links.map((link) => renderLink(link, linkClass))}
                    <Link href="/auth/signin" className={linkClass}>
                        Se connecter
                    </Link>
                    <Button
                        className={`rounded-full px-5 transition-all duration-200 hover:scale-[1.04] ${
                            solid ? "bg-brand-gradient text-white hover:bg-[#1668d6]" : "bg-white text-[#0B1220] hover:bg-white/90"
                        }`}
                        asChild
                    >
                        <Link href="/auth/signup">Commencer</Link>
                    </Button>
                </nav>
                <div className="flex items-center gap-2 md:hidden">
                    <Button
                        size="sm"
                        className={`rounded-full transition-colors ${solid ? "bg-brand-gradient text-white" : "bg-white text-[#0B1220]"}`}
                        asChild
                    >
                        <Link href="/auth/signup">Commencer</Link>
                    </Button>
                    <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-expanded={menuOpen}
                        aria-controls="menu-mobile"
                        aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                            solid ? "text-[#0B1220] hover:bg-black/[0.05]" : "text-white hover:bg-white/10"
                        }`}
                    >
                        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {menuOpen && (
                <div id="menu-mobile" className="border-t border-black/[0.06] bg-[#F7F8FC] md:hidden">
                    <nav className="container mx-auto flex flex-col px-4 py-2">
                        {links.map((link) => renderLink(link, mobileLinkClass, () => setMenuOpen(false)))}
                        <Link href="/auth/signin" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                            Se connecter
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    )
}
