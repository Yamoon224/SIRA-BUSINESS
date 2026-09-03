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
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
            {/* Left */}
            <div className="flex items-center gap-4">

                {/* Mobile menu button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setOpen(!open)}>
                    <Menu className="h-5 w-5" />
                </Button>

                {/* Desktop navigation */}
                <nav className="hidden md:flex items-center gap-6">
                    {navItems.map((item) => {
                        const isActive =
                            pathname === item.href || pathname.startsWith(`${item.href}/`)

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "text-sm font-medium transition-colors",
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

            {/* Right side */}
            <div className="flex items-center gap-2 md:gap-4">
                {/* Search (hidden mobile) */}
                <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                        type="search"
                        placeholder="Rechercher..."
                        className="w-40 md:w-64 pl-9 rounded-sm" />
                </div>

                {/* Icons */}
                <NotificationBell />

                {/* User Menu Dropdown */}
                <UserMenu />
            </div>
        </header>
    )
}