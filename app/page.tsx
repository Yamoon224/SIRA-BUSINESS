"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Reveal, ScrollProgress, MarketingMotionStyles } from "@/components/marketing/reveal"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import {
    ArrowRight,
    ArrowUpRight,
    Sparkles,
    Video,
    Wallet,
    Languages,
} from "lucide-react"

const candidates = [
    { name: "Aïcha Koné", role: "Product Designer", score: 96, tone: "cobalt" },
    { name: "Yao N'Guessan", role: "Ingénieur Backend", score: 91, tone: "coral" },
    { name: "Fatou Diabaté", role: "Comptable Senior", score: 87, tone: "slate" },
] as const

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
    { title: "Mobile Money", description: "Payez votre abonnement via Paiement Pro, sans carte bancaire internationale." },
    { title: "Support local", description: "Une équipe basée en Côte d'Ivoire, aux fuseaux et usages qui sont les vôtres." },
]

// ---------- Match card ----------

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

function MatchCard({
    candidate,
    className = "",
    variant = "solid",
}: {
    candidate: (typeof candidates)[number]
    className?: string
    variant?: "solid" | "glass"
}) {
    const colors = scoreColor(candidate.tone)
    const initials = candidate.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)

    const surface =
        variant === "glass"
            ? "bg-white/10 backdrop-blur-xl ring-1 ring-white/15 shadow-[0_20px_45px_-20px_rgba(0,0,0,0.5)]"
            : "bg-white ring-1 ring-black/5 shadow-[0_20px_45px_-20px_rgba(11,18,32,0.35)]"
    const nameColor = variant === "glass" ? "text-white" : "text-[#0B1220]"
    const roleColor = variant === "glass" ? "text-white/60" : "text-[#5B6472]"
    const trackColor = variant === "glass" ? "stroke-white/15" : "stroke-black/[0.06]"

    return (
        <div
            className={`match-card-hover flex items-center gap-4 rounded-3xl px-5 py-4 transition-transform duration-300 ${surface} ${className}`}
        >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${colors.bg} ${colors.text}`}>
                {initials}
            </div>
            <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-semibold ${nameColor}`}>{candidate.name}</p>
                <p className={`truncate text-xs ${roleColor}`}>{candidate.role}</p>
            </div>
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
                    <circle cx="20" cy="20" r="16" fill="none" strokeWidth="4" className={trackColor} />
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
        <div className="min-h-screen bg-[#F7F8FC]">
            <ScrollProgress />
            <SiteHeader page="home" />

            {/* Hero */}
            <section className="relative overflow-hidden bg-[#0B1220]">
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-soft-light"
                    style={{
                        backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                    }}
                />
                <div className="orb-drift-1 pointer-events-none absolute -top-24 right-[-10%] h-[520px] w-[520px] rounded-full bg-[#2447FF]/25 blur-[120px]" />
                <div className="orb-drift-2 pointer-events-none absolute bottom-[-15%] left-[-5%] h-[380px] w-[380px] rounded-full bg-[#FF6B4A]/15 blur-[110px]" />

                <div className="container relative z-10 mx-auto grid grid-cols-1 gap-16 px-4 pb-20 pt-32 md:px-6 md:pb-28 md:pt-36 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-32 lg:pt-40">
                    <div>
                        <h1
                            className="text-4xl leading-[1.06] tracking-tight text-white sm:text-5xl md:text-[3.75rem]"
                        >
                            Le bon candidat,
                            <br />
                            <span
                                className="bg-gradient-to-r from-[#FF6B4A] via-[#c9a2ff] to-[#9db4ff] bg-clip-text italic text-transparent"
                                style={{ fontWeight: 400 }}
                            >
                                sans le tri de CV.
                            </span>
                        </h1>

                        <p className="mt-6 max-w-lg text-base leading-relaxed text-[#B7C0DB] sm:text-lg">
                            Goriya note et classe vos candidatures avec l&apos;IA, organise vos entretiens vidéo,
                            et vous laisse le temps de choisir - pas de trier.
                        </p>

                        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                            <Button size="lg" className="group rounded-full bg-white px-7 font-semibold text-[#0B1220] transition-transform duration-200 hover:scale-[1.03] hover:bg-white/90" asChild>
                                <Link href="/auth/signup" className="gap-2">
                                    Commencer gratuitement
                                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                                </Link>
                            </Button>
                            <a
                                href="#comment-ca-marche"
                                className="text-sm font-semibold text-white/80 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white"
                            >
                                Voir comment ça marche
                            </a>
                        </div>
                    </div>

                    {/* Signature: floating match-card stack - desktop */}
                    <div className="relative hidden h-[380px] lg:block">
                        <MatchCard
                            candidate={candidates[0]}
                            variant="glass"
                            className="match-float-1 absolute left-4 top-0 w-[300px] -rotate-3"
                        />
                        <MatchCard
                            candidate={candidates[1]}
                            variant="glass"
                            className="match-float-2 absolute left-32 top-32 w-[300px] rotate-2"
                        />
                        <MatchCard
                            candidate={candidates[2]}
                            variant="glass"
                            className="match-float-3 absolute left-6 top-[248px] w-[300px] -rotate-1"
                        />
                    </div>

                    {/* Signature: static stack - mobile/tablet */}
                    <div className="flex flex-col gap-3 lg:hidden">
                        {candidates.map((c) => (
                            <MatchCard key={c.name} candidate={c} variant="glass" />
                        ))}
                    </div>
                </div>
            </section>

            {/* Capability bento */}
            <section className="border-b border-black/[0.06] bg-white py-16">
                <div className="container mx-auto px-4 md:px-6">
                    <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
                        <div className="tilt-card rounded-3xl border border-black/[0.06] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:col-span-2 lg:col-span-2 lg:row-span-2">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0B1220]">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="mt-5 text-lg font-semibold text-[#0B1220]">Scoring IA des CV</h3>
                            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#5B6472]">
                                Chaque candidature reçoit un score de compatibilité et un résumé automatique,
                                dès sa réception.
                            </p>
                            <div className="mt-6 max-w-xs">
                                <MatchCard candidate={candidates[0]} />
                            </div>
                        </div>

                        <div className="tilt-card rounded-3xl bg-[#0B1220] p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                                <Video className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="mt-5 text-base font-semibold text-white">Goriya Call</h3>
                            <p className="mt-2 text-sm leading-relaxed text-[#B7C0DB]">
                                Entretiens vidéo intégrés, sans lien tiers à partager.
                            </p>
                        </div>

                        <div className="tilt-card rounded-3xl bg-[#FFF4F0] p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF6B4A]">
                                <Wallet className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="mt-5 text-base font-semibold text-[#0B1220]">Mobile Money</h3>
                            <p className="mt-2 text-sm leading-relaxed text-[#5B6472]">
                                Abonnement réglé via Paiement Pro, comme vos autres services du quotidien.
                            </p>
                        </div>

                        <div className="tilt-card flex flex-col justify-center rounded-3xl border border-black/[0.06] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:col-span-2 lg:col-span-2">
                            <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0B1220]">
                                    <Languages className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-[#0B1220]">100% en français</h3>
                                    <p className="mt-1 text-sm leading-relaxed text-[#5B6472]">
                                        Pensé, traduit et supporté pour vos équipes RH locales.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* How it works */}
            <section id="comment-ca-marche" className="bg-[#F7F8FC] py-24">
                <div className="container mx-auto px-4 md:px-6">
                    <Reveal className="mx-auto max-w-2xl text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF6B4A]">
                            Le parcours
                        </p>
                        <h2 className="mt-3 text-3xl text-[#0B1220] sm:text-4xl">
                            De l&apos;offre à l&apos;embauche, en quatre étapes
                        </h2>
                    </Reveal>

                    <div className="relative mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-black/[0.08] lg:block" />
                        {steps.map((step, i) => (
                            <Reveal key={step.n} delay={i * 90} className="relative flex flex-col items-start">
                                <span
                                    className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1220] text-sm text-white transition-transform duration-300 hover:scale-110"
                                >
                                    {step.n}
                                </span>
                                <h3 className="mt-5 text-base font-semibold text-[#0B1220]">{step.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#5B6472]">{step.description}</p>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Feature spotlight */}
            <section className="bg-white py-24">
                <div className="container mx-auto flex flex-col gap-24 px-4 md:px-6">
                    <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
                        <Reveal>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2447FF]">
                                Scoring IA
                            </p>
                            <h3 className="mt-3 text-2xl text-[#0B1220] sm:text-3xl">
                                Un tri qui vous fait gagner des journées entières
                            </h3>
                            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#5B6472]">
                                Chaque candidature est analysée, résumée et notée dès sa réception.
                                Vous ouvrez votre tableau de bord et voyez d&apos;emblée qui mérite votre attention.
                            </p>
                        </Reveal>
                        <Reveal delay={120} className="rounded-3xl bg-[#F7F8FC] p-8">
                            <div className="flex flex-col gap-3">
                                {candidates.map((c) => (
                                    <MatchCard key={c.name} candidate={c} />
                                ))}
                            </div>
                        </Reveal>
                    </div>

                    <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
                        <Reveal className="order-2 rounded-3xl bg-[#0B1220] p-8 lg:order-1">
                            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2447FF]/20">
                                        <Video className="h-4 w-4 text-[#9db4ff]" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-white">Entretien - Aïcha Koné</p>
                                        <p className="text-xs text-[#8891ab]">Goriya Call</p>
                                    </div>
                                </div>
                                <span className="flex items-center gap-1.5 rounded-full bg-[#FF6B4A]/15 px-2.5 py-1 text-[11px] font-semibold text-[#FF6B4A]">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF6B4A]" />
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
                        </Reveal>
                        <Reveal delay={120} className="order-1 lg:order-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2447FF]">
                                Goriya Call
                            </p>
                            <h3 className="mt-3 text-2xl text-[#0B1220] sm:text-3xl">
                                Des entretiens qui ne quittent jamais la plateforme
                            </h3>
                            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#5B6472]">
                                Plus de lien de visio à chercher dans vos e-mails. Planifiez, menez et
                                retrouvez vos entretiens au même endroit que vos candidatures.
                            </p>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* Region fit */}
            <section className="bg-[#FFF4F0] py-20">
                <div className="container mx-auto px-4 md:px-6">
                    <Reveal className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl text-[#0B1220] sm:text-4xl">
                            Conçu pour vos réalités, pas importé d&apos;ailleurs
                        </h2>
                    </Reveal>
                    <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
                        {regionPoints.map((point, i) => (
                            <Reveal
                                key={point.title}
                                delay={i * 90}
                                className="rounded-3xl bg-white/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white"
                            >
                                <h3 className="text-[15px] font-semibold text-[#0B1220]">{point.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#5B6472]">{point.description}</p>
                            </Reveal>
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
                        className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#2447FF] transition-colors hover:text-[#0B1220]"
                    >
                        Voir les tarifs
                        <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative overflow-hidden bg-[#0B1220] py-24">
                <div className="orb-drift-1 pointer-events-none absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-[#2447FF]/20 blur-[130px]" />
                <Reveal className="container relative z-10 mx-auto px-4 text-center md:px-6">
                    <h2 className="mx-auto max-w-xl text-3xl text-white sm:text-4xl">
                        Donnez à votre équipe RH une longueur d&apos;avance
                    </h2>
                    <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[#B7C0DB]">
                        Goriya est disponible dès aujourd&apos;hui pour les entreprises basées en
                        Côte d&apos;Ivoire et dans la zone UEMOA.
                    </p>
                    <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Button size="lg" className="rounded-full bg-white px-7 font-semibold text-[#0B1220] transition-transform duration-200 hover:scale-[1.03] hover:bg-white/90" asChild>
                            <Link href="/auth/signup">Commencer gratuitement</Link>
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="rounded-full border-white/25 bg-transparent px-7 text-white transition-transform duration-200 hover:scale-[1.03] hover:bg-white/10"
                            asChild
                        >
                            <Link href="/assistance">Parler à l&apos;équipe</Link>
                        </Button>
                    </div>
                </Reveal>
            </section>

            <SiteFooter />
            <MarketingMotionStyles />
        </div>
    )
}
