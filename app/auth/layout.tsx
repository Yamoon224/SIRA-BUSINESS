"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SessionProvider } from "next-auth/react"
import { ChevronLeft, Sparkles, Video, Wallet } from "lucide-react"
import { GoriyaLogo } from "@/components/goriya-logo"
import { MarketingMotionStyles } from "@/components/marketing/reveal"

const pitchPoints = [
    { icon: Sparkles, label: "Scoring IA des candidatures" },
    { icon: Video, label: "Entretiens vidéo intégrés" },
    { icon: Wallet, label: "Abonnement en Mobile Money" },
]

/**
 * Pages qui prennent toute la largeur : le panneau de marque latéral et le
 * `max-w-2xl` du contenu écrasaient la grille de forfaits (3 cards) sur un
 * écran de 1440px. Ces pages portent leur propre en-tête et centrent
 * elles-mêmes leur contenu.
 */
const FULL_WIDTH_ROUTES = ["/auth/signup/plan"]

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isFullWidth = FULL_WIDTH_ROUTES.includes(pathname)

    // SessionProvider : les pages /auth/* peuvent être atteintes par une
    // entreprise déjà connectée (consultation/changement de forfait), et ont
    // alors besoin de useSession pour adapter leurs redirections.
    return (
        <SessionProvider>
            {isFullWidth ? (
                <FullWidthShell>{children}</FullWidthShell>
            ) : (
                <SplitShell>{children}</SplitShell>
            )}
            <MarketingMotionStyles />
        </SessionProvider>
    )
}

/** Coquille pleine largeur, sans barre latérale. */
function FullWidthShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-[#F7F8FC]">
            <header className="flex items-center justify-between gap-4 px-4 py-5 md:px-8">
                <GoriyaLogo />
                <div className="flex items-center gap-4">
                    <Link
                        href="/tarification"
                        className="hidden text-sm font-medium text-[#5B6472] transition-colors hover:text-[#0B1220] sm:block"
                    >
                        Comparer les tarifs
                    </Link>
                    <Link
                        href="/assistance"
                        className="text-sm font-medium text-[#5B6472] transition-colors hover:text-[#0B1220]"
                    >
                        Besoin d&apos;aide ?
                    </Link>
                </div>
            </header>

            <main className="w-full flex-1 pb-16">{children}</main>
        </div>
    )
}

/** Coquille par défaut : panneau de marque + formulaire (connexion, inscription…). */
function SplitShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#F7F8FC] lg:grid lg:grid-cols-[440px_1fr]">
            {/* Brand panel - desktop only */}
            <aside className="relative hidden overflow-hidden bg-[#1e7df2] lg:flex lg:flex-col lg:justify-between lg:p-10">
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-soft-light"
                    style={{
                        backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                    }}
                />
                <div className="orb-drift-1 pointer-events-none absolute -top-24 right-[-30%] h-[420px] w-[420px] rounded-full bg-[#2447FF]/25 blur-[110px]" />
                <div className="orb-drift-2 pointer-events-none absolute bottom-[-20%] left-[-20%] h-[320px] w-[320px] rounded-full bg-[#FF6B4A]/15 blur-[100px]" />

                <Link href="/" className="relative z-10 inline-flex w-fit items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white">
                    <ChevronLeft className="h-4 w-4" />
                    Retour au site
                </Link>

                <div className="relative z-10">
                    <GoriyaLogo variant="white" />
                    <h2 className="mt-8 max-w-xs text-3xl leading-[1.15] text-white">
                        Le bon candidat,{" "}
                        <span className="bg-gradient-to-r from-[#FF6B4A] via-[#c9a2ff] to-[#9db4ff] bg-clip-text text-transparent">
                            sans le tri de CV.
                        </span>
                    </h2>
                    <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#e6f1ff]">
                        Rejoignez les entreprises qui recrutent avec Goriya en Côte d&apos;Ivoire et dans la zone UEMOA.
                    </p>
                </div>

                <ul className="relative z-10 space-y-3">
                    {pitchPoints.map((point) => (
                        <li key={point.label} className="flex items-center gap-3 text-sm text-[#e6f1ff]">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                                <point.icon className="h-4 w-4 text-white" />
                            </span>
                            {point.label}
                        </li>
                    ))}
                </ul>
            </aside>

            {/* Content */}
            <div className="flex flex-col">
                <header className="flex items-center justify-between px-4 py-5 md:px-8 lg:justify-end">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3.5 py-1.5 text-sm font-medium text-[#5B6472] transition-colors hover:border-black/20 hover:text-[#0B1220] lg:hidden"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Retour
                    </Link>
                    <GoriyaLogo className="lg:hidden" />
                    <Link
                        href="/tarification"
                        className="hidden text-sm font-medium text-[#5B6472] transition-colors hover:text-[#0B1220] lg:block"
                    >
                        Voir les tarifs
                    </Link>
                </header>

                <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-4 md:px-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
