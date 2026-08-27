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
import { fraunces, marketingMono as mono } from "@/lib/marketing/fonts"
import { Reveal, ScrollProgress, MarketingMotionStyles } from "@/components/marketing/reveal"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import { Check } from "lucide-react"
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
        answer: "Oui, tous les paiements sont traités via Kkiapay, notre partenaire de paiement sécurisé.",
    },
]

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

    const business = plans.find((p) => p.billingPeriod === "MONTHLY")
    const businessPlus = plans.find((p) => p.billingPeriod === "ANNUAL")

    return (
        <div className={`min-h-screen bg-[#F7F8FC] ${mono.variable}`}>
            <ScrollProgress />
            <SiteHeader page="tarification" />

            {/* Hero */}
            <section className="relative overflow-hidden bg-[#0B1220]">
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
                    <div className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9db4ff] ${mono.className}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B4A]" />
                        Tarification
                    </div>
                    <h1 className={`${fraunces.className} mx-auto mt-6 max-w-2xl text-4xl leading-[1.1] tracking-tight text-white sm:text-5xl`}>
                        Un tarif simple,{" "}
                        <span
                            className="bg-gradient-to-r from-[#FF6B4A] via-[#c9a2ff] to-[#9db4ff] bg-clip-text italic text-transparent"
                            style={{ fontWeight: 400 }}
                        >
                            qui grandit avec vous.
                        </span>
                    </h1>
                    <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[#B7C0DB] sm:text-lg">
                        Du premier poste publié à la croissance de votre équipe RH — sans surprise sur la facture,
                        réglable en Mobile Money.
                    </p>
                </div>
            </section>

            {/* Plans */}
            <section className="bg-[#F7F8FC] py-20">
                <div className="container mx-auto px-4 md:px-6">
                    {loading ? (
                        <div className="mx-auto flex max-w-3xl flex-col items-stretch justify-center gap-6 lg:flex-row">
                            <Skeleton className="h-[420px] w-full rounded-3xl lg:w-[320px]" />
                            <Skeleton className="h-[420px] w-full rounded-3xl lg:mt-7 lg:w-[300px]" />
                        </div>
                    ) : (
                        <Reveal className="flex flex-col items-stretch justify-center gap-6 lg:flex-row lg:items-start">
                            {business && (
                                <div className="relative w-full max-w-[400px] self-center lg:w-[320px] lg:max-w-none">
                                    <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                                        <span
                                            className={`${mono.className} whitespace-nowrap rounded-full bg-[#0B1220] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white shadow-lg`}
                                        >
                                            Forfait populaire
                                        </span>
                                    </div>
                                    <div className="rounded-[28px] bg-gradient-to-br from-[#2447FF] via-[#8f7bff] to-[#FF6B4A] p-[2.5px] shadow-[0_25px_60px_-25px_rgba(36,71,255,0.55)] transition-transform duration-300 hover:-translate-y-1">
                                        <div className="overflow-hidden rounded-[26px] bg-white">
                                            <div className="p-7">
                                                <h3 className="text-2xl font-semibold text-[#0B1220]">{business.name}</h3>
                                                <p className="mt-1 text-sm text-[#5B6472]">Pour les entreprises en croissance</p>
                                                <div className="mt-5 flex items-baseline gap-1.5">
                                                    <span className={`${fraunces.className} text-4xl text-[#0B1220]`}>
                                                        {Number(business.price).toLocaleString("fr-FR")}
                                                    </span>
                                                    <span className="text-sm font-medium text-[#5B6472]">FCFA / mois</span>
                                                </div>
                                                <Button
                                                    asChild
                                                    className="mt-6 w-full rounded-full bg-[#0B1220] text-white transition-transform duration-200 hover:scale-[1.02] hover:bg-[#0B1220]/90"
                                                >
                                                    <Link href="/auth/signup">Commencer</Link>
                                                </Button>
                                            </div>
                                            <div className="border-t border-black/[0.06] bg-[#F7F8FC] px-7 py-6">
                                                <ul className="space-y-3">
                                                    {business.features.map((f, i) => (
                                                        <li key={i} className="flex items-start gap-2.5 text-sm text-[#5B6472]">
                                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2447FF]" />
                                                            {f}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {businessPlus && (
                                <div className="w-full max-w-[400px] self-center lg:mt-7 lg:w-[300px] lg:max-w-none">
                                    <div className="overflow-hidden rounded-[26px] border border-black/[0.06] bg-white shadow-sm transition-transform duration-300 hover:-translate-y-1">
                                        <div className="p-7">
                                            <h3 className="text-2xl font-semibold text-[#0B1220]">{businessPlus.name}</h3>
                                            <p className="mt-1 text-sm text-[#5B6472]">Pour les grandes entreprises</p>
                                            <div className="mt-5 flex items-baseline gap-1.5">
                                                <span className={`${fraunces.className} text-4xl text-[#0B1220]`}>
                                                    {Number(businessPlus.price).toLocaleString("fr-FR")}
                                                </span>
                                                <span className="text-sm font-medium text-[#5B6472]">FCFA / an</span>
                                            </div>
                                            <Button
                                                asChild
                                                variant="outline"
                                                className="mt-6 w-full rounded-full border-black/10 transition-transform duration-200 hover:scale-[1.02]"
                                            >
                                                <Link href="/auth/signup">Commencer</Link>
                                            </Button>
                                        </div>
                                        <div className="border-t border-black/[0.06] bg-[#F7F8FC] px-7 py-6">
                                            <ul className="space-y-3">
                                                {businessPlus.features.map((f, i) => (
                                                    <li key={i} className="flex items-start gap-2.5 text-sm text-[#5B6472]">
                                                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#5B6472]" />
                                                        {f}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!business && !businessPlus && (
                                <p className="text-center text-sm text-[#5B6472]">
                                    Les forfaits ne sont pas disponibles pour le moment. Réessayez plus tard.
                                </p>
                            )}
                        </Reveal>
                    )}
                </div>
            </section>

            {/* FAQ */}
            <section className="bg-white py-24">
                <div className="container mx-auto px-4 md:px-6">
                    <Reveal className="mx-auto max-w-2xl text-center">
                        <p className={`${mono.className} text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF6B4A]`}>
                            Questions fréquentes
                        </p>
                        <h2 className={`${fraunces.className} mt-3 text-3xl text-[#0B1220] sm:text-4xl`}>
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
            <section className="relative overflow-hidden bg-[#0B1220] py-24">
                <div className="orb-drift-1 pointer-events-none absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-[#2447FF]/20 blur-[130px]" />
                <Reveal className="container relative z-10 mx-auto px-4 text-center md:px-6">
                    <h2 className={`${fraunces.className} mx-auto max-w-xl text-3xl text-white sm:text-4xl`}>
                        Prêt à recruter avec Goriya ?
                    </h2>
                    <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[#B7C0DB]">
                        Sans engagement caché, sans carte bancaire internationale — commencez dès aujourd&apos;hui.
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
