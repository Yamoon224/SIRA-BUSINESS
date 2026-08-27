"use client"

import Link from "next/link"
import { Fraunces, JetBrains_Mono } from "next/font/google"
import { Button } from "@/components/ui/button"
import { GoriyaLogo } from "@/components/goriya-logo"
import {
    ArrowRight,
    ArrowUpRight,
    Sparkles,
    Video,
    Wallet,
    Languages,
} from "lucide-react"

const fraunces = Fraunces({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    style: ["normal", "italic"],
    variable: "--font-fraunces",
})

const mono = JetBrains_Mono({
    subsets: ["latin"],
    weight: ["500", "600"],
    variable: "--font-mono-marketing",
})

const candidates = [
    { name: "Aïcha Koné", role: "Product Designer", score: 96, tone: "cobalt" },
    { name: "Yao N'Guessan", role: "Ingénieur Backend", score: 91, tone: "coral" },
    { name: "Fatou Diabaté", role: "Comptable Senior", score: 87, tone: "slate" },
] as const

const capabilities = [
    {
        icon: Sparkles,
        title: "Scoring IA des CV",
        description: "Chaque candidature reçoit un score de compatibilité et un résumé automatique.",
    },
    {
        icon: Video,
        title: "Goriya Call",
        description: "Entretiens vidéo intégrés à la plateforme, sans lien tiers à partager.",
    },
    {
        icon: Wallet,
        title: "Mobile Money",
        description: "Abonnement réglé via Kkiapay, comme vos autres services du quotidien.",
    },
    {
        icon: Languages,
        title: "100% en français",
        description: "Pensé, traduit et supporté pour vos équipes RH locales.",
    },
]

const steps = [
    {
        n: "01",
        title: "Publiez votre offre",
        description: "Décrivez le poste, les critères et le budget. Deux minutes suffisent.",
    },
    {
        n: "02",
        title: "L'IA trie les candidatures",
        description: "Chaque CV reçu est noté, classé et résumé automatiquement.",
    },
    {
        n: "03",
        title: "Échangez en visio",
        description: "Menez vos entretiens dans Goriya Call, sans quitter la plateforme.",
    },
    {
        n: "04",
        title: "Décidez et suivez",
        description: "Recrutez depuis votre tableau de bord et suivez vos équipes dans la durée.",
    },
]

const regionPoints = [
    { title: "Français natif", description: "Interface et support pensés pour vos équipes, pas traduits à la va-vite." },
    { title: "Mobile Money", description: "Payez votre abonnement via Kkiapay, sans carte bancaire internationale." },
    { title: "Support local", description: "Une équipe basée en Côte d'Ivoire, aux fuseaux et usages qui sont les vôtres." },
]

function scoreColor(tone: (typeof candidates)[number]["tone"]) {
    switch (tone) {
        case "cobalt":
            return { bg: "bg-[#2447FF]/10", text: "text-[#2447FF]", ring: "stroke-[#2447FF]" }
        case "coral":
            return { bg: "bg-[#FF6B4A]/10", text: "text-[#FF6B4A]", ring: "stroke-[#FF6B4A]" }
        default:
            return { bg: "bg-[#5B6472]/10", text: "text-[#5B6472]", ring: "stroke-[#5B6472]" }
    }
}

function MatchCard({ candidate, className = "" }: { candidate: (typeof candidates)[number]; className?: string }) {
    const colors = scoreColor(candidate.tone)
    const initials = candidate.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)

    return (
        <div
            className={`flex items-center gap-4 rounded-3xl bg-white px-5 py-4 shadow-[0_20px_45px_-20px_rgba(11,18,32,0.35)] ring-1 ring-black/5 ${className}`}
        >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${colors.bg} ${colors.text}`}>
                {initials}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#0B1220]">{candidate.name}</p>
                <p className="truncate text-xs text-[#5B6472]">{candidate.role}</p>
            </div>
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
                    <circle cx="20" cy="20" r="16" fill="none" strokeWidth="4" className="stroke-black/[0.06]" />
                    <circle
                        cx="20"
                        cy="20"
                        r="16"
                        fill="none"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${(candidate.score / 100) * 100.5} 100.5`}
                        className={colors.ring}
                    />
                </svg>
                <span className={`absolute text-[11px] font-bold ${colors.text}`}>{candidate.score}</span>
            </div>
        </div>
    )
}

export default function HomePage() {
    return (
        <div className={`min-h-screen bg-[#F7F8FC] ${mono.variable}`}>
            {/* Navigation */}
            <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[#F7F8FC]/80 backdrop-blur-md">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                    <GoriyaLogo />
                    <nav className="hidden md:flex items-center gap-7">
                        <a href="#comment-ca-marche" className="text-sm font-medium text-[#5B6472] hover:text-[#0B1220] transition-colors">
                            Comment ça marche
                        </a>
                        <Link href="/tarification" className="text-sm font-medium text-[#5B6472] hover:text-[#0B1220] transition-colors">
                            Tarifs
                        </Link>
                        <Link href="/auth/signin" className="text-sm font-medium text-[#5B6472] hover:text-[#0B1220] transition-colors">
                            Se connecter
                        </Link>
                        <Button className="rounded-full bg-[#0B1220] px-5 text-white hover:bg-[#0B1220]/90" asChild>
                            <Link href="/auth/signup">Commencer</Link>
                        </Button>
                    </nav>
                    <Button size="sm" className="md:hidden rounded-full bg-[#0B1220] text-white hover:bg-[#0B1220]/90" asChild>
                        <Link href="/auth/signup">Commencer</Link>
                    </Button>
                </div>
            </header>

            {/* Hero */}
            <section className="relative overflow-hidden bg-[#0B1220]">
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-soft-light"
                    style={{
                        backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                    }}
                />
                <div className="pointer-events-none absolute -top-24 right-[-10%] h-[520px] w-[520px] rounded-full bg-[#2447FF]/25 blur-[120px]" />
                <div className="pointer-events-none absolute bottom-[-15%] left-[-5%] h-[380px] w-[380px] rounded-full bg-[#FF6B4A]/15 blur-[110px]" />

                <div className="container relative z-10 mx-auto grid grid-cols-1 gap-16 px-4 py-20 md:px-6 md:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-32">
                    <div>
                        <div className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9db4ff] ${mono.className}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B4A]" />
                            Recrutement augmenté par l&apos;IA · UEMOA
                        </div>

                        <h1
                            className={`${fraunces.className} mt-6 text-4xl leading-[1.08] text-white sm:text-5xl md:text-6xl`}
                        >
                            Le bon candidat,
                            <br />
                            <span className="italic text-[#9db4ff]" style={{ fontWeight: 400 }}>
                                sans le tri de CV.
                            </span>
                        </h1>

                        <p className="mt-6 max-w-lg text-base leading-relaxed text-[#B7C0DB] sm:text-lg">
                            Goriya note et classe vos candidatures avec l&apos;IA, organise vos entretiens vidéo,
                            et vous laisse le temps de choisir — pas de trier.
                        </p>

                        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                            <Button size="lg" className="rounded-full bg-white px-7 text-[#0B1220] hover:bg-white/90 font-semibold" asChild>
                                <Link href="/auth/signup" className="gap-2">
                                    Commencer gratuitement
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <a
                                href="#comment-ca-marche"
                                className="text-sm font-semibold text-white/80 hover:text-white transition-colors underline underline-offset-4 decoration-white/30"
                            >
                                Voir comment ça marche
                            </a>
                        </div>
                    </div>

                    {/* Signature: floating match-card stack — desktop */}
                    <div className="relative hidden h-[380px] lg:block">
                        <MatchCard
                            candidate={candidates[0]}
                            className="match-float-1 absolute left-4 top-0 w-[300px] -rotate-3"
                        />
                        <MatchCard
                            candidate={candidates[1]}
                            className="match-float-2 absolute left-32 top-32 w-[300px] rotate-2"
                        />
                        <MatchCard
                            candidate={candidates[2]}
                            className="match-float-3 absolute left-6 top-[248px] w-[300px] -rotate-1"
                        />
                    </div>

                    {/* Signature: static stack — mobile/tablet */}
                    <div className="flex flex-col gap-3 lg:hidden">
                        {candidates.map((c) => (
                            <MatchCard key={c.name} candidate={c} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Capability strip */}
            <section className="border-b border-black/[0.06] bg-white">
                <div className="container mx-auto grid grid-cols-1 gap-8 px-4 py-14 sm:grid-cols-2 md:px-6 lg:grid-cols-4">
                    {capabilities.map((cap) => (
                        <div key={cap.title} className="flex flex-col gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1220]">
                                <cap.icon className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="text-[15px] font-semibold text-[#0B1220]">{cap.title}</h3>
                            <p className="text-sm leading-relaxed text-[#5B6472]">{cap.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section id="comment-ca-marche" className="bg-[#F7F8FC] py-24">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="mx-auto max-w-2xl text-center">
                        <p className={`${mono.className} text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF6B4A]`}>
                            Le parcours
                        </p>
                        <h2 className={`${fraunces.className} mt-3 text-3xl text-[#0B1220] sm:text-4xl`}>
                            De l&apos;offre à l&apos;embauche, en quatre étapes
                        </h2>
                    </div>

                    <div className="relative mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-black/[0.08] lg:block" />
                        {steps.map((step) => (
                            <div key={step.n} className="relative flex flex-col items-start">
                                <span
                                    className={`${mono.className} relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1220] text-sm text-white`}
                                >
                                    {step.n}
                                </span>
                                <h3 className="mt-5 text-base font-semibold text-[#0B1220]">{step.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#5B6472]">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Feature spotlight */}
            <section className="bg-white py-24">
                <div className="container mx-auto flex flex-col gap-24 px-4 md:px-6">
                    <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
                        <div>
                            <p className={`${mono.className} text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2447FF]`}>
                                Scoring IA
                            </p>
                            <h3 className={`${fraunces.className} mt-3 text-2xl text-[#0B1220] sm:text-3xl`}>
                                Un tri qui vous fait gagner des journées entières
                            </h3>
                            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#5B6472]">
                                Chaque candidature est analysée, résumée et notée dès sa réception.
                                Vous ouvrez votre tableau de bord et voyez d&apos;emblée qui mérite votre attention.
                            </p>
                        </div>
                        <div className="rounded-3xl bg-[#F7F8FC] p-8">
                            <div className="flex flex-col gap-3">
                                {candidates.map((c) => (
                                    <MatchCard key={c.name} candidate={c} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
                        <div className="order-2 lg:order-1 rounded-3xl bg-[#0B1220] p-8">
                            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2447FF]/20">
                                        <Video className="h-4 w-4 text-[#9db4ff]" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-white">Entretien — Aïcha Koné</p>
                                        <p className="text-xs text-[#8891ab]">Goriya Call</p>
                                    </div>
                                </div>
                                <span className="flex items-center gap-1.5 rounded-full bg-[#FF6B4A]/15 px-2.5 py-1 text-[11px] font-semibold text-[#FF6B4A]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B4A]" />
                                    En direct
                                </span>
                            </div>
                            <div className="mt-3 flex h-24 items-end gap-1.5 rounded-2xl bg-white/5 px-5 py-4">
                                {[40, 70, 45, 90, 60, 35, 75, 50, 65, 30].map((h, i) => (
                                    <span
                                        key={i}
                                        className="w-full min-h-[4px] rounded-full bg-[#9db4ff]/60"
                                        style={{ height: `${h}%` }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="order-1 lg:order-2">
                            <p className={`${mono.className} text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2447FF]`}>
                                Goriya Call
                            </p>
                            <h3 className={`${fraunces.className} mt-3 text-2xl text-[#0B1220] sm:text-3xl`}>
                                Des entretiens qui ne quittent jamais la plateforme
                            </h3>
                            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#5B6472]">
                                Plus de lien de visio à chercher dans vos e-mails. Planifiez, menez et
                                retrouvez vos entretiens au même endroit que vos candidatures.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Region fit */}
            <section className="bg-[#FFF4F0] py-20">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className={`${fraunces.className} text-3xl text-[#0B1220] sm:text-4xl`}>
                            Conçu pour vos réalités, pas importé d&apos;ailleurs
                        </h2>
                    </div>
                    <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
                        {regionPoints.map((point) => (
                            <div key={point.title} className="rounded-3xl bg-white/70 p-6">
                                <h3 className="text-[15px] font-semibold text-[#0B1220]">{point.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#5B6472]">{point.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing teaser */}
            <section className="border-y border-black/[0.06] bg-white py-10">
                <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-6">
                    <p className="text-[15px] text-[#0B1220]">
                        <span className="font-semibold">Un tarif simple, sans surprise.</span>{" "}
                        <span className="text-[#5B6472]">Mensuel ou annuel, réglable en Mobile Money.</span>
                    </p>
                    <Link
                        href="/tarification"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2447FF] hover:text-[#0B1220] transition-colors"
                    >
                        Voir les tarifs
                        <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative overflow-hidden bg-[#0B1220] py-24">
                <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-[#2447FF]/20 blur-[130px]" />
                <div className="container relative z-10 mx-auto px-4 text-center md:px-6">
                    <h2 className={`${fraunces.className} mx-auto max-w-xl text-3xl text-white sm:text-4xl`}>
                        Donnez à votre équipe RH une longueur d&apos;avance
                    </h2>
                    <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[#B7C0DB]">
                        Goriya est disponible dès aujourd&apos;hui pour les entreprises basées en
                        Côte d&apos;Ivoire et dans la zone UEMOA.
                    </p>
                    <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Button size="lg" className="rounded-full bg-white px-7 text-[#0B1220] hover:bg-white/90 font-semibold" asChild>
                            <Link href="/auth/signup">Commencer gratuitement</Link>
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="rounded-full border-white/25 bg-transparent px-7 text-white hover:bg-white/10"
                            asChild
                        >
                            <Link href="/assistance">Parler à l&apos;équipe</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-10">
                <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 md:flex-row md:px-6">
                    <GoriyaLogo showTagline={true} />
                    <nav className="flex items-center gap-6 text-sm text-[#5B6472]">
                        <a href="#comment-ca-marche" className="hover:text-[#0B1220] transition-colors">Comment ça marche</a>
                        <Link href="/tarification" className="hover:text-[#0B1220] transition-colors">Tarifs</Link>
                        <Link href="/assistance" className="hover:text-[#0B1220] transition-colors">Assistance</Link>
                    </nav>
                    <p className="text-xs text-[#8891ab]">
                        © {new Date().getFullYear()} Goriya — Recrutement pour l&apos;Afrique de l&apos;Ouest.
                    </p>
                </div>
            </footer>

            <style jsx>{`
                @keyframes matchFloat1 {
                    0%, 100% { transform: translateY(0) rotate(-3deg); }
                    50% { transform: translateY(-12px) rotate(-3deg); }
                }
                @keyframes matchFloat2 {
                    0%, 100% { transform: translateY(0) rotate(2deg); }
                    50% { transform: translateY(10px) rotate(2deg); }
                }
                @keyframes matchFloat3 {
                    0%, 100% { transform: translateY(0) rotate(-1deg); }
                    50% { transform: translateY(-8px) rotate(-1deg); }
                }
                .match-float-1 { animation: matchFloat1 6s ease-in-out infinite; }
                .match-float-2 { animation: matchFloat2 7s ease-in-out infinite; }
                .match-float-3 { animation: matchFloat3 5.5s ease-in-out infinite; }
                @media (prefers-reduced-motion: reduce) {
                    .match-float-1, .match-float-2, .match-float-3 { animation: none; }
                }
            `}</style>
        </div>
    )
}
