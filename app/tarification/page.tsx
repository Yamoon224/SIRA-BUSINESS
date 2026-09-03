"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Reveal, ScrollProgress, MarketingMotionStyles } from "@/components/marketing/reveal"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import { Check, Gift, Sparkles } from "lucide-react"
import { subscriptionService } from "@/lib/api/subscription.service"

interface Plan {
    id: string
    name: string
    price: number
    billingPeriod: string
    features: string[]
}

const faqs = [
    {
        question: "Que comprend l'offre gratuite ?",
        answer:
            "L'offre gratuite s'active sans paiement et donne accès au tableau de bord, à la publication d'offres, à la gestion de vos annonces, au suivi des candidatures, à la messagerie et au profil entreprise. Les Services RH, les appels vidéo et les intégrations API restent réservés aux forfaits Business et Business+.",
    },
    {
        question: "Puis-je changer de forfait à tout moment ?",
        answer: "Oui, vous pouvez upgrader ou downgrader votre forfait à tout moment depuis vos paramètres. Les changements prennent effet immédiatement.",
    },
    {
        question: "Comment fonctionne la facturation ?",
        answer: "La facturation est automatique selon la périodicité choisie (mensuelle ou annuelle). Vous recevrez une facture par email à chaque échéance.",
    },
    {
        question: "Puis-je annuler mon abonnement ?",
        answer: "Vous pouvez annuler votre abonnement à tout moment depuis vos paramètres. L'accès reste actif jusqu'à la fin de la période payée.",
    },
    {
        question: "Le paiement est-il sécurisé ?",
        answer: "Oui, tous les paiements sont traités via Paiement Pro, notre partenaire de paiement sécurisé.",
    },
]

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

export default function TarificationPage() {
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)

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
    // supplémentaire — l'« Offre gratuite » (mensuelle) n'apparaissait jamais.
    // On rend maintenant la liste renvoyée par l'API, du moins cher au plus cher.
    const sortedPlans = [...plans].sort((a, b) => Number(a.price) - Number(b.price))
    const popularPlanId = findPopularPlanId(sortedPlans)

    return (
        <div className="min-h-screen bg-[#F7F8FC]">
            <ScrollProgress />
            <SiteHeader page="tarification" />

            {/* Hero */}
            <section className="relative overflow-hidden bg-[#1e7df2]">
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-soft-light"
                    style={{
                        backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                    }}
                />
                <div className="orb-drift-1 pointer-events-none absolute -top-24 right-[-10%] h-[480px] w-[480px] rounded-full bg-[#2447FF]/25 blur-[120px]" />
                <div className="orb-drift-2 pointer-events-none absolute bottom-[-25%] left-[-10%] h-[360px] w-[360px] rounded-full bg-[#FF6B4A]/15 blur-[110px]" />

                <div className="container relative z-10 mx-auto px-4 pb-20 pt-32 text-center md:px-6 md:pb-24 md:pt-40">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e6f1ff]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B4A]" />
                        Tarification
                    </div>
                    <h1 className="mx-auto mt-6 max-w-2xl text-4xl leading-[1.1] tracking-tight text-white sm:text-5xl">
                        Un tarif simple,{" "}
                        <span className="bg-gradient-to-r from-[#FF6B4A] via-[#c9a2ff] to-[#9db4ff] bg-clip-text text-transparent">
                            qui grandit avec vous.
                        </span>
                    </h1>
                    <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[#e6f1ff] sm:text-lg">
                        Du premier poste publié à la croissance de votre équipe RH - sans surprise sur la facture,
                        réglable en Mobile Money.
                    </p>
                </div>
            </section>

            {/* Plans */}
            <section className="bg-[#F7F8FC] py-20">
                <div className="container mx-auto px-4 md:px-6">
                    {loading ? (
                        <div className="mx-auto flex max-w-[1100px] flex-wrap justify-center gap-6">
                            <Skeleton className="h-[440px] w-full max-w-sm rounded-3xl sm:w-[calc(50%-0.75rem)] lg:w-[330px]" />
                            <Skeleton className="h-[440px] w-full max-w-sm rounded-3xl sm:w-[calc(50%-0.75rem)] lg:w-[330px]" />
                            <Skeleton className="h-[440px] w-full max-w-sm rounded-3xl sm:w-[calc(50%-0.75rem)] lg:w-[330px]" />
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
                                        className={`relative flex w-full max-w-sm flex-col overflow-hidden rounded-[26px] bg-white transition-transform duration-300 hover:-translate-y-1 sm:w-[calc(50%-0.75rem)] lg:w-[330px] ${
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
                                                    : plan.billingPeriod === "ANNUAL"
                                                      ? "Pour les grandes entreprises"
                                                      : "Pour les entreprises en croissance"}
                                            </p>

                                            <div className="mt-5 flex items-baseline gap-1.5">
                                                <span className="text-4xl text-[#0B1220]">
                                                    {isFree ? "0" : Number(plan.price).toLocaleString("fr-FR")}
                                                </span>
                                                <span className="text-sm font-medium text-[#5B6472]">
                                                    FCFA / {plan.billingPeriod === "ANNUAL" ? "an" : "mois"}
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
                                                    Services RH, appels vidéo et intégrations API restent réservés
                                                    aux forfaits payants.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </Reveal>
                    )}
                </div>
            </section>

            {/* FAQ */}
            <section className="bg-white py-24">
                <div className="container mx-auto px-4 md:px-6">
                    <Reveal className="mx-auto max-w-2xl text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF6B4A]">
                            Questions fréquentes
                        </p>
                        <h2 className="mt-3 text-3xl text-[#0B1220] sm:text-4xl">
                            Ce que nos clients demandent le plus
                        </h2>
                    </Reveal>

                    <Reveal delay={100} className="mx-auto mt-12 max-w-2xl">
                        <Accordion type="single" collapsible className="rounded-3xl border border-black/[0.06] bg-[#F7F8FC] px-6">
                            {faqs.map((faq) => (
                                <AccordionItem key={faq.question} value={faq.question} className="border-black/[0.06]">
                                    <AccordionTrigger className="py-5 text-[15px] font-semibold text-[#0B1220] hover:no-underline">
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-sm leading-relaxed text-[#5B6472]">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </Reveal>
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative overflow-hidden bg-[#1e7df2] py-24">
                <div className="orb-drift-1 pointer-events-none absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-[#2447FF]/20 blur-[130px]" />
                <Reveal className="container relative z-10 mx-auto px-4 text-center md:px-6">
                    <h2 className="mx-auto max-w-xl text-3xl text-white sm:text-4xl">
                        Prêt à recruter avec Goriya ?
                    </h2>
                    <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[#e6f1ff]">
                        Sans engagement caché, sans carte bancaire internationale - commencez dès aujourd&apos;hui.
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
                            <Link href="/assistance">Nous contacter</Link>
                        </Button>
                    </div>
                </Reveal>
            </section>

            <SiteFooter />
            <MarketingMotionStyles />
        </div>
    )
}
