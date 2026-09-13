"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Reveal, ScrollProgress, MarketingMotionStyles } from "@/components/marketing/reveal"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import {
    ArrowRight,
    ArrowUpRight,
    CalendarDays,
    ClipboardCheck,
    DollarSign,
    FileSignature,
    FolderOpen,
    Languages,
    Sparkles,
    UserCheck,
    UserPlus,
    Video,
    Wallet,
    Check, 
    Gift
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { CustomPlanCard } from "@/components/marketing/custom-plan-card"
import { subscriptionService } from "@/lib/api/subscription.service"


interface Plan {
    id: string
    name: string
    price: number
    billingPeriod: string
    features: string[]
    /** Durées choisissables en mois (ex. [1,3,6,12]) ; absent/null = fixe à 1 mois. */
    availablePeriods?: number[] | null
}

const PERIOD_LABELS: Record<number, string> = {
    1: "1 mois",
    3: "3 mois",
    6: "6 mois",
    12: "12 mois",
}

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
        description: "Menez vos entretiens sur GORIYA Meet, sans quitter la plateforme.",
    },
    {
        n: "04",
        title: "Décidez et suivez",
        description: "Recrutez depuis votre tableau de bord et suivez vos équipes dans la durée.",
    },
]

/**
 * Fonctionnalités RH de la plateforme, dans l'ordre du parcours d'un employé
 * (arrivée → suivi → sortie). Chaque entrée pointe vers l'écran correspondant
 * de l'espace connecté : un visiteur non authentifié est renvoyé sur la
 * connexion par le middleware, ce qui reste le bon point d'entrée.
 */
const hrFeatures = [
    {
        icon: UserCheck,
        title: "Dossiers employés",
        description: "Un répertoire unique : coordonnées, poste, ancienneté, documents rattachés.",
        href: "/services-rh/employes",
    },
    {
        icon: UserPlus,
        title: "Recrutements",
        description: "Vos campagnes et leurs candidats suivis au même endroit que vos offres.",
        href: "/services-rh/recrutements",
    },
    {
        icon: FileSignature,
        title: "Contrats",
        description: "Rédaction, signature et renouvellements, avec les échéances sous les yeux.",
        href: "/services-rh/contrats",
    },
    {
        icon: CalendarDays,
        title: "Congés et absences",
        description: "Demandes, validations et soldes, sans le tableur qui circule par e-mail.",
        href: "/services-rh/conges",
    },
    {
        icon: DollarSign,
        title: "Gestion de paie",
        description: "Éléments variables, bulletins et historique, prêts pour votre comptable.",
        href: "/services-rh/paie",
    },
    {
        icon: ClipboardCheck,
        title: "Évaluations",
        description: "Campagnes d'entretien annuel et suivi des objectifs de chaque équipe.",
        href: "/services-rh/evaluations",
    },
    {
        icon: FolderOpen,
        title: "Documents RH",
        description: "Attestations, notes de service et pièces obligatoires, archivées et retrouvables.",
        href: "/services-rh/documents",
    },
] as const

/** Captures de l'application montrées dans le hero, dans l'ordre de la pile. */
const appPreviews = [
    {
        src: "/images/apercu-dashboard.jpeg",
        alt: "Tableau de bord Goriya : annonces actives, candidatures reçues et évolution des candidatures",
        label: "Votre tableau de bord",
    },
    {
        src: "/images/apercu-poster-offre.jpeg",
        alt: "Formulaire de publication d'une offre d'emploi avec l'aperçu de l'annonce",
        label: "Publier une offre",
    },
] as const

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
            className={`match-card-hover flex items-center gap-4 rounded-md px-5 py-4 transition-transform duration-300 ${surface} ${className}`}
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

/**
 * Aperçu de l'application dans le hero : capture d'écran posée dans un cadre
 * clair, cadrée sur le haut de la page (`object-top`) - c'est là que se lit
 * l'écran, une capture pleine hauteur réduirait tout à un aplat gris.
 */
function AppPreview({
    src,
    alt,
    label,
    className = "",
}: {
    src: string
    alt: string
    label: string
    className?: string
}) {
    return (
        <figure
            className={`overflow-hidden rounded-xl bg-white shadow-[0_24px_60px_-24px_rgba(11,18,32,0.55)] ring-1 ring-white/20 transition-transform duration-300 ${className}`}
        >
            <img
                src={src}
                alt={alt}
                loading="lazy"
                className="h-[210px] w-full object-cover object-top"
            />
            <figcaption className="px-4 py-2.5 text-xs font-semibold text-[#0B1220]">{label}</figcaption>
        </figure>
    )
}

/**
 * En-tête de section de la page d'accueil : titre en H1 gras centré, sous-titre
 * en H3 centré. Toutes les sections l'utilisent, pour une hiérarchie identique.
 */
function SectionHeading({
    title,
    subtitle,
    tone = "dark",
    className = "",
}: {
    title: string
    subtitle?: string
    tone?: "dark" | "light"
    className?: string
}) {
    return (
        <div className={`mx-auto max-w-3xl text-center ${className}`}>
            <h1
                className={`text-center text-2xl font-extrabold leading-tight sm:text-4xl md:text-[38px] lg:text-[46px] ${
                    tone === "light" ? "text-white" : "text-[#111827]"
                }`}
            >
                {title}
            </h1>
            {subtitle && (
                <h3
                    className={`mt-4 text-center text-base font-normal leading-relaxed sm:text-lg ${
                        tone === "light" ? "text-[#e6f1ff]" : "text-[#5B6472]"
                    }`}
                >
                    {subtitle}
                </h3>
            )}
        </div>
    )
}

/**
 * Forfait mis en avant : le premier payant mensuel (« Business »), plan standard
 * entre l'offre gratuite et l'annuel.
 */
function findPopularPlanId(plans: Plan[]): string | null {
    const paidMonthly = plans.filter((p) => Number(p.price) > 0 && p.billingPeriod === "MONTHLY")
    if (paidMonthly.length > 0) return paidMonthly[0].id
    const paid = plans.filter((p) => Number(p.price) > 0)
    return paid.length > 0 ? paid[0].id : null
}

export default function HomePage() {
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    // Durée choisie par plan (affichage seulement — cette page n'ouvre pas de
    // checkout, le choix réel se fait à l'inscription/souscription).
    const [periodByPlan, setPeriodByPlan] = useState<Record<string, number>>({})
    const periodFor = (plan: Plan) => periodByPlan[plan.id] ?? plan.availablePeriods?.[0] ?? 1

    useEffect(() => {
        subscriptionService.getPlans("ENTREPRISE")
            .then((res) => {
                const data = (res as any)?.data ?? res ?? []
                setPlans(Array.isArray(data) ? data : [])
            })
            .catch(() => setPlans([]))
            .finally(() => setLoading(false))
    }, [])

    // Les forfaits étaient sélectionnés par période de facturation
    // (`find(MONTHLY)` / `find(ANNUAL)`), ce qui masquait tout plan
    // supplémentaire - l'« Offre gratuite » (mensuelle) n'apparaissait jamais.
    // On rend maintenant la liste renvoyée par l'API, du moins cher au plus cher.
    const sortedPlans = [...plans].sort((a, b) => Number(a.price) - Number(b.price))
    const popularPlanId = findPopularPlanId(sortedPlans)

    return (
        <div className="min-h-screen bg-[#F7F8FC]">
            <ScrollProgress />
            <SiteHeader page="home" />

            {/* Hero */}
            <section className="relative overflow-hidden bg-brand-gradient">
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
                            className="text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl md:text-[3.75rem]"
                        >
                            Le bon candidat,
                            <br />
                            sans le tri de CV.
                        </h1>

                        <p className="mt-6 max-w-lg text-base leading-relaxed text-[#e6f1ff] sm:text-lg">
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

                    {/* Signature: pile flottante d'aperçus de l'app - desktop */}
                    <div className="relative hidden h-[380px] lg:block">
                        {appPreviews.map((preview, i) => (
                            <AppPreview
                                key={preview.src}
                                {...preview}
                                className={
                                    i === 0
                                        ? "match-float-1 absolute left-0 top-0 w-[350px] -rotate-3"
                                        : "match-float-2 absolute left-28 top-[168px] w-[350px] rotate-2"
                                }
                            />
                        ))}
                    </div>

                    {/* Signature: pile statique - mobile/tablette */}
                    <div className="flex flex-col gap-4 lg:hidden">
                        {appPreviews.map((preview) => (
                            <AppPreview key={preview.src} {...preview} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Capability bento */}
            <section className="border-b border-black/[0.06] bg-white py-16">
                <div className="container mx-auto px-4 md:px-6">
                    <SectionHeading
                        className="mb-12"
                        title="Tout pour recruter, au même endroit"
                        subtitle="L'IA note vos candidatures, GORIYA Meet accueille vos entretiens et votre abonnement se règle en Mobile Money."
                    />
                    <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
                        {/* Aperçu de la page Candidatures incliné à 18°. Tourné, il
                            occupe environ 1,2 fois sa largeur et 1,1 fois sa largeur en
                            hauteur : la hauteur minimale de la cellule lui laisse cette place. */}
                        <div className="flex min-h-[320px] items-center justify-center py-6 sm:col-span-2 sm:min-h-[460px] lg:col-span-2 lg:row-span-2 lg:min-h-[500px]">
                            <img
                                src="/images/apercu-candidatures.jpeg"
                                alt="Page Candidatures de Goriya : chaque candidat noté par l'IA, avec ses compétences et sa compatibilité"
                                loading="lazy"
                                className="w-[86%] max-w-[480px] rotate-[18deg] rounded-xl shadow-[0_24px_60px_-24px_rgba(11,18,32,0.45)] ring-1 ring-black/5"
                            />
                        </div>

                        <div className="tilt-card rounded-md bg-brand-gradient p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
                                <Video className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="mt-5 text-base font-semibold text-white">GORIYA Meet</h3>
                            <p className="mt-2 text-sm leading-relaxed text-[#e6f1ff]">
                                Entretiens vidéo intégrés : le candidat rejoint la salle depuis son espace Goriya.
                            </p>
                        </div>

                        <div className="tilt-card rounded-md bg-brand-gradient p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#FF6B4A]">
                                <Wallet className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="mt-5 text-base font-semibold text-white">Mobile Money</h3>
                            <p className="mt-2 text-sm leading-relaxed text-[#e6f1ff]">
                                Abonnement réglé via Paiement Pro, comme vos autres services du quotidien.
                            </p>
                        </div>

                        <div className="tilt-card flex flex-col justify-center rounded-md border border-black/[0.06] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:col-span-2 lg:col-span-2">
                            <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1e7df2]">
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
                    <SectionHeading
                        title="De l'offre à l'embauche"
                        subtitle="Quatre étapes pour passer d'un poste ouvert à une nouvelle recrue, sans jongler entre les outils."
                    />

                    <div className="relative mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-black/[0.08] lg:block" />
                        {steps.map((step, i) => (
                            <Reveal key={step.n} delay={i * 90} className="relative flex flex-col items-start">
                                <span
                                    className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#1e7df2] text-sm text-white transition-transform duration-300 hover:scale-110"
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
                <div className="container mx-auto mb-16 px-4 md:px-6">
                    <SectionHeading
                        title="Moins de tri, plus d'échanges"
                        subtitle="L'IA fait le premier tri, GORIYA Meet accueille vos entretiens : vous gardez votre temps pour les bons profils."
                    />
                </div>
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
                        <Reveal delay={120} className="rounded-md bg-[#F7F8FC] p-8">
                            <div className="flex flex-col gap-3">
                                {candidates.map((c) => (
                                    <MatchCard key={c.name} candidate={c} />
                                ))}
                            </div>
                        </Reveal>
                    </div>

                    <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
                        <Reveal className="order-2 rounded-md bg-brand-gradient p-8 lg:order-1">
                            <div className="flex items-center justify-between rounded-md bg-white/5 px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2447FF]/20">
                                        <Video className="h-4 w-4 text-[#e6f1ff]" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-white">Entretien - Aïcha Koné</p>
                                        <p className="text-xs text-[#8891ab]">GORIYA Meet</p>
                                    </div>
                                </div>
                                <span className="flex items-center gap-1.5 rounded-full bg-[#FF6B4A]/15 px-2.5 py-1 text-[11px] font-semibold text-[#FF6B4A]">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF6B4A]" />
                                    En direct
                                </span>
                            </div>
                            <div className="mt-3 flex h-24 items-end gap-1.5 rounded-md bg-white/5 px-5 py-4">
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
                                GORIYA Meet
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

            {/* Services RH */}
            <section id="services-rh" className="bg-[#F7F8FC] py-24">
                <div className="container mx-auto px-4 md:px-6">
                    <SectionHeading
                        title="Services RH"
                        subtitle="Une fois la recrue arrivée, suivez tout son parcours : contrats, congés, paie, évaluations et documents."
                    />

                    <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {hrFeatures.map((feature, i) => (
                            <Reveal key={feature.title} delay={i * 60}>
                                <Link
                                    href={feature.href}
                                    className="group flex h-full flex-col rounded-md border border-black/[0.06] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e7df2]/10">
                                        <feature.icon className="h-5 w-5 text-[#1e7df2]" />
                                    </div>
                                    <h3 className="mt-4 text-[15px] font-semibold text-[#0B1220]">{feature.title}</h3>
                                    <p className="mt-2 flex-1 text-sm leading-relaxed text-[#5B6472]">
                                        {feature.description}
                                    </p>
                                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#2447FF]">
                                        Découvrir
                                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </span>
                                </Link>
                            </Reveal>
                        ))}

                        {/* 8e cellule de la grille : la carte d'appel à l'action
                            complète la rangée au lieu de laisser un trou. */}
                        <Reveal delay={hrFeatures.length * 60}>
                            <div className="flex h-full flex-col justify-between rounded-md bg-brand-gradient p-6">
                                <div>
                                    <h3 className="text-[15px] font-semibold text-white">
                                        Toute votre RH, dès l&apos;offre gratuite
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[#e6f1ff]">
                                        Les Services RH sont inclus dans tous les forfaits, offre gratuite comprise.
                                    </p>
                                </div>
                                <div className="mt-5 flex flex-col gap-2">
                                    <Button
                                        size="sm"
                                        className="rounded-full bg-white font-semibold text-[#0B1220] hover:bg-white/90"
                                        asChild
                                    >
                                        <Link href="/auth/signup">Essayer gratuitement</Link>
                                    </Button>
                                    <Link
                                        href="/tarification"
                                        className="text-center text-xs font-semibold text-white/80 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white"
                                    >
                                        Voir les forfaits
                                    </Link>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* Region fit */}
            <section className="bg-brand-gradient py-20">
                <div className="container mx-auto px-4 md:px-6">
                    <Reveal>
                        <SectionHeading
                            tone="light"
                            title="Conçu pour vos réalités, pas importé d'ailleurs"
                            subtitle="Une plateforme pensée pour les entreprises de Côte d'Ivoire et de la zone UEMOA."
                        />
                    </Reveal>
                    <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
                        {regionPoints.map((point, i) => (
                            <Reveal
                                key={point.title}
                                delay={i * 90}
                                className="rounded-md bg-white/10 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white/15"
                            >
                                <h3 className="text-[15px] font-semibold text-white">{point.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#e6f1ff]">{point.description}</p>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing teaser */}
            {/* <section className="border-y border-black/[0.06] bg-white py-10">
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
            </section> */}
            {/* Plans */}
            <section id="tarification" className="bg-[#F7F8FC] py-20">
                <div className="container mx-auto px-4 md:px-6">
                    <SectionHeading
                        className="mb-12"
                        title="Les Plans Tarifaires"
                        subtitle="Commencez gratuitement, puis passez à un forfait payant quand vos recrutements s'accélèrent. Paiement en Mobile Money."
                    />
                    
                    {loading ? (
                        <div className="mx-auto flex max-w-[1100px] flex-wrap justify-center gap-6">
                            <Skeleton className="h-[440px] w-full max-w-sm rounded-md bg-brand-gradient sm:w-[calc(50%-0.75rem)] lg:w-[330px]" />
                            <Skeleton className="h-[440px] w-full max-w-sm rounded-md bg-brand-gradient sm:w-[calc(50%-0.75rem)] lg:w-[330px]" />
                            <Skeleton className="h-[440px] w-full max-w-sm rounded-md bg-brand-gradient sm:w-[calc(50%-0.75rem)] lg:w-[330px]" />
                        </div>
                    ) : sortedPlans.length === 0 ? (
                        <p className="text-center text-sm text-[#5B6472]">
                            Les forfaits ne sont pas disponibles pour le moment. Réessayez plus tard.
                        </p>
                    ) : (
                        // flex-wrap plutôt qu'une grille : avec 3 offres sur 2 colonnes
                        // (tablette), une grille laisserait la 3e collée à gauche.
                        <Reveal className="mx-auto flex w-full max-w-[1100px] flex-wrap items-stretch justify-center gap-6">
                            {sortedPlans.map((plan) => {
                                const isFree = Number(plan.price) === 0
                                const isPopular = plan.id === popularPlanId

                                return (
                                    <div
                                        key={plan.id}
                                        className={`relative flex w-full max-w-sm flex-col overflow-hidden rounded-md bg-white transition-transform duration-300 hover:-translate-y-1 sm:w-[calc(50%-0.75rem)] lg:w-[330px] ${
                                            isPopular
                                                ? "border-2 border-[#2447FF] shadow-[0_25px_60px_-30px_rgba(36,71,255,0.5)]"
                                                : "border border-black/[0.06] shadow-sm"
                                        }`}
                                    >
                                        {isPopular && (
                                            <span className="absolute right-5 top-5 whitespace-nowrap rounded-full bg-[#1e7df2] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                                                Choix populaire
                                            </span>
                                        )}

                                        <div className="p-7">
                                            <div className="flex items-center gap-2">
                                                {isFree ? (
                                                    <Gift className="h-4 w-4 text-[#16a34a]" />
                                                ) : (
                                                    <Sparkles className="h-4 w-4 text-[#2447FF]" />
                                                )}
                                                <h3 className="text-xl font-semibold text-[#0B1220]">{plan.name}</h3>
                                            </div>

                                            <p className="mt-1 text-sm text-[#5B6472]">
                                                {isFree
                                                    ? "Testez l'espace recrutement sans payer"
                                                    : plan.name === "Business+"
                                                      ? "Pour les grandes entreprises"
                                                      : "Pour les entreprises en croissance"}
                                            </p>

                                            {!isFree && plan.availablePeriods && plan.availablePeriods.length > 1 && (
                                                <div className="mt-4 flex flex-wrap gap-1.5">
                                                    {plan.availablePeriods.map((months) => (
                                                        <button
                                                            key={months}
                                                            type="button"
                                                            onClick={() =>
                                                                setPeriodByPlan((prev) => ({ ...prev, [plan.id]: months }))
                                                            }
                                                            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                                                periodFor(plan) === months
                                                                    ? "border-[#2447FF] bg-[#2447FF]/10 text-[#2447FF]"
                                                                    : "border-black/10 text-[#5B6472] hover:border-black/20"
                                                            }`}
                                                        >
                                                            {PERIOD_LABELS[months] ?? `${months} mois`}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="mt-5 flex items-baseline gap-1.5">
                                                <span className="text-4xl text-[#0B1220]">
                                                    {isFree
                                                        ? "0"
                                                        : (Number(plan.price) * periodFor(plan)).toLocaleString("fr-FR")}
                                                </span>
                                                <span className="text-sm font-medium text-[#5B6472]">
                                                    FCFA / {periodFor(plan) > 1 ? `${periodFor(plan)} mois` : "mois"}
                                                </span>
                                            </div>

                                            <Button
                                                asChild
                                                variant={isPopular || isFree ? "default" : "outline"}
                                                className={`mt-6 w-full rounded-full transition-transform duration-200 hover:scale-[1.02] ${
                                                    isPopular
                                                        ? "bg-[#2447FF] text-white hover:bg-[#1d3ce0]"
                                                        : isFree
                                                          ? "bg-[#1e7df2] text-white hover:bg-[#1668d6]"
                                                          : "border-black/10"
                                                }`}
                                            >
                                                <Link href="/auth/signup">
                                                    {isFree ? "Commencer gratuitement" : "Commencer"}
                                                </Link>
                                            </Button>
                                        </div>

                                        <div className="flex-1 border-t border-black/[0.06] bg-[#F7F8FC] px-7 py-6">
                                            <ul className="space-y-3">
                                                {(plan.features ?? []).map((f, i) => (
                                                    <li
                                                        key={i}
                                                        className="flex items-start gap-2.5 text-sm text-[#5B6472]"
                                                    >
                                                        <Check
                                                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                                                                isFree ? "text-[#16a34a]" : "text-[#2447FF]"
                                                            }`}
                                                        />
                                                        {f}
                                                    </li>
                                                ))}
                                            </ul>

                                            {isFree && (
                                                <p className="mt-4 text-xs leading-relaxed text-[#8891ab]">
                                                    Services RH inclus. Goriya Meet et intégrations API restent
                                                    réservés aux forfaits payants.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                            <CustomPlanCard />
                        </Reveal>
                    )}
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative overflow-hidden bg-brand-gradient py-24">
                <div className="orb-drift-1 pointer-events-none absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-[#2447FF]/20 blur-[130px]" />
                <Reveal className="container relative z-10 mx-auto px-4 text-center md:px-6">
                    <SectionHeading
                        tone="light"
                        title="Donnez à votre équipe RH une longueur d'avance"
                        subtitle="Goriya est disponible dès aujourd'hui pour les entreprises basées en Côte d'Ivoire et dans la zone UEMOA."
                    />
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
