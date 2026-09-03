"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Users,
    MessageSquare,
    Building2,
    Settings,
    HelpCircle,
    Send,
    Briefcase,
    ChevronDown,
    ChevronRight,
    FileText,
    UserPlus,
    UserCheck,
    FileSignature,
    CalendarDays,
    DollarSign,
    FolderOpen,
    KeyRound,
    Video,
    CreditCard,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { GoriyaLogo } from "./goriya-logo"
import { useSidebar } from "./sidebar-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState } from "react"
import UserMenu from "./user-menu"

const mainNavItems = [
    { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
    { label: "Poster une offre d'emploi", href: "/poster-offre", icon: Send },
    { label: "Mes annonces", href: "/annonces", icon: Briefcase },
    { label: "Candidatures", href: "/candidatures", icon: Users },
    { label: "Messages", href: "/messages", icon: MessageSquare },
    { label: "Appels vidéo", href: "/appels", icon: Video },
    // { label: "Service RH", href: "/service-rh", icon: Building2 },
    // { label: "Profil Entreprise", href: "/profil", icon: Building2 },
]

const serviceRhItems = [
    { label: "Employés", href: "/services-rh/employes", icon: UserCheck },
    { label: "Recrutements", href: "/services-rh/recrutements", icon: UserPlus },
    { label: "Évaluations Employés", href: "/services-rh/evaluations", icon: FileText },
    { label: "Contrats", href: "/services-rh/contrats", icon: FileSignature },
    { label: "Congés", href: "/services-rh/conges", icon: CalendarDays },
    { label: "Gestion de Paie", href: "/services-rh/paie", icon: DollarSign },
    { label: "Documents RH", href: "/services-rh/documents", icon: FolderOpen },
]

const settingsNavItems = [
    { label: "Paramètres", href: "/parametres", icon: Settings },
    { label: "Mon forfait", href: "/auth/signup/plan", icon: CreditCard },
    { label: "Intégrations API", href: "/integrations-api", icon: KeyRound },
    { label: "Centre d'assistance", href: "/assistance", icon: HelpCircle },
]

export function AppSidebar() {
    const pathname = usePathname()
    const { open, setOpen } = useSidebar()
    const isRhActive = pathname.startsWith("/services-rh")
    const [rhOpen, setRhOpen] = useState(isRhActive)

    return (
        <>
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 w-64 bg-secondary border-r border-border transition-transform duration-200",
                    open ? "translate-x-0" : "-translate-x-full",
                    "md:translate-x-0"
                )}>
                {/* Logo */}
                <div className="flex h-16 items-center px-6">
                    {/* Dans l'espace connecté, le logo ramène au tableau de bord :
                        renvoyer vers "/" faisait sortir de l'application. */}
                    <GoriyaLogo href="/dashboard" />
                </div>

                {/* Main Navigation */}
                <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                    {mainNavItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                <span className="truncate">{item.label}</span>
                            </Link>
                        )
                    })}

                    {/* Services RH expandable */}
                    <button
                        onClick={() => setRhOpen(!rhOpen)}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isRhActive
                                ? "text-primary font-semibold"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}>
                        <FileText className={cn("h-4 w-4 shrink-0", isRhActive ? "text-primary" : "")} />
                        <span className="flex-1 text-left">Services RH</span>
                        {rhOpen ? (<ChevronDown className="h-3 w-3" />) : (<ChevronRight className="h-3 w-3" />)}
                    </button>

                    {rhOpen && (
                        <div className="ml-4 space-y-0.5 border-l border-border pl-3">
                            {serviceRhItems.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                                            isActive
                                                ? "text-primary font-semibold"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        )}>
                                        {item.label}
                                    </Link>
                                )
                            })}
                        </div>
                    )}

                    <Link
                        href="/profil"
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            pathname === "/profil"
                                ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}>
                        <Building2 className={cn("h-4 w-4 shrink-0", pathname === "/profil" ? "text-primary-foreground" : "text-muted-foreground")} />
                        Profil Entreprise
                    </Link>
                </nav>

                {/* Settings */}
                <div className="border-t border-border px-3 py-4">
                    <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Paramètres
                    </p>

                    {settingsNavItems.map((item) => {
                        const isActive = pathname === item.href

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                <span className="truncate">{item.label}</span>
                            </Link>
                        )
                    })}
                </div>

                {/* User */}
                <UserMenu variant="sidebar" />
            </aside>

            {/* Overlay mobile */}
            {open && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 md:hidden"
                    onClick={() => setOpen(false)}
                />
            )}
        </>
    )
}