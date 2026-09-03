"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { usePathname } from "next/navigation"
import { useSidebar } from "./sidebar-context"
import { Button } from "@/components/ui/button"
import { Search, Menu } from "lucide-react"
import UserMenu from "./user-menu"
import { NotificationBell } from "./notification-bell"

// Navigation d'une entreprise CONNECTÉE : elle doit rester dans son espace.
// « Accueil » pointait sur la landing publique (/) et « Tarifs d'abonnement »
// sur la page marketing (/tarification) : deux sorties de l'application qui
// obligeaient à revenir en arrière pour retrouver son tableau de bord.
const navItems = [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Mes annonces", href: "/annonces" },
    { label: "Candidatures", href: "/candidatures" },
    { label: "Mon forfait", href: "/auth/signup/plan" },
]

export function AppHeader() {
    const pathname = usePathname()
    const { open, setOpen } = useSidebar()

    return (
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-card px-4 md:gap-6 md:px-6">
            {/* Gauche : ouverture du menu (mobile) et navigation (desktop).
                `shrink-0` pour que la recherche prenne l'espace restant sans
                jamais chevaucher les liens. */}
            <div className="flex shrink-0 items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Ouvrir le menu"
                    onClick={() => setOpen(!open)}>
                    <Menu className="h-5 w-5" />
                </Button>

                <nav className="hidden items-center gap-4 lg:flex xl:gap-6">
                    {navItems.map((item) => {
                        const isActive =
                            pathname === item.href || pathname.startsWith(`${item.href}/`)

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "whitespace-nowrap text-sm font-medium transition-colors",
                                    isActive
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Recherche : occupe toute la largeur laissée libre, plafonnée pour
                ne pas s'étirer démesurément sur les très grands écrans. Masquée
                sous `sm`, comme avant, la place y étant prise par le menu. */}
            <div className="relative hidden min-w-0 flex-1 sm:block sm:max-w-xl lg:max-w-2xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Rechercher une offre, une candidature..."
                    aria-label="Rechercher"
                    className="w-full rounded-sm pl-9" />
            </div>

            {/* Droite : actions seules — le nom et l'e-mail ont quitté l'en-tête,
                ils restent affichés en bas de la barre latérale. */}
            <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
                <NotificationBell />
                <UserMenu variant="header" />
            </div>
        </header>
    )
}
