"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { MessageSquare, Mail, Phone, Search, ChevronDown, Star, Zap, FileText, Users, CreditCard, BookOpen, Video, FileCode, Check, UserCog, X } from "lucide-react"
import { subscriptionService } from "@/lib/api/subscription.service"
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF, SUPPORT_PHONE, SUPPORT_PHONE_HREF } from "@/lib/contact"
import { AssistanceNav, AssistanceFooterActions, AssistanceFooterLinks } from "@/components/assistance-nav"

interface Plan {
    id: string
    name: string
    price: number
    billingPeriod: string
    features: string[]
}

/**
 * Catégories du centre d'assistance. `id` est la clé de filtrage : elle doit
 * correspondre au `tag` des FAQ ci-dessous, c'est ce lien qui rend les cards
 * cliquables (voir `visibleFaqs`).
 */
const categories = [
    { id: "IA", label: "IA", Icon: Zap, bg: "bg-blue-500" },
    { id: "Offres", label: "Offres", Icon: FileText, bg: "bg-green-500" },
    { id: "Candidatures", label: "Candidatures", Icon: Users, bg: "bg-orange-400" },
    { id: "RH", label: "RH", Icon: UserCog, bg: "bg-violet-500" },
    { id: "Facturation", label: "Facturation", Icon: CreditCard, bg: "bg-red-500" },
] as const

type CategoryId = (typeof categories)[number]["id"]

const faqs: { question: string; tag: CategoryId; tagColor: string; answer: string }[] = [
    { question: "Comment optimiser mes offres d'emploi avec l'IA ?", tag: "IA", tagColor: "bg-blue-100 text-blue-600", answer: "L'IA de Goriya analyse automatiquement vos offres et suggere des ameliorations pour attirer les meilleurs candidats." },
    { question: "Comment interpreter le score IA des candidats ?", tag: "IA", tagColor: "bg-blue-100 text-blue-600", answer: "Le score IA represente la compatibilite entre le profil du candidat et votre offre. Au-dessus de 80, le match est excellent." },
    { question: "Puis-je modifier une offre apres publication ?", tag: "Offres", tagColor: "bg-green-100 text-green-600", answer: "Oui. Depuis Mes annonces, ouvrez l'offre et cliquez sur Modifier." },
    { question: "Comment contacter un candidat ?", tag: "Candidatures", tagColor: "bg-orange-100 text-orange-600", answer: "Depuis Candidatures, cliquez sur Message dans la fiche du candidat." },
    { question: "Que contiennent les Services RH ?", tag: "RH", tagColor: "bg-violet-100 text-violet-600", answer: "Les Services RH regroupent la gestion des employes, des recrutements, des evaluations, des contrats, des conges, de la paie et des documents RH. Ils sont accessibles depuis la rubrique Services RH de votre espace." },
    { question: "Les Services RH sont-ils inclus dans l'offre gratuite ?", tag: "RH", tagColor: "bg-violet-100 text-violet-600", answer: "Oui. L'offre gratuite couvre le tableau de bord, la publication d'offres, les annonces, les candidatures, la messagerie, le profil entreprise et l'ensemble des Services RH. Seuls les appels video Goriya Meet et les integrations API necessitent un forfait Business ou Business+." },
    { question: "Comment ajouter un employe a mon equipe ?", tag: "RH", tagColor: "bg-violet-100 text-violet-600", answer: "Ouvrez Services RH puis Employes, et utilisez le bouton d'ajout pour creer la fiche de l'employe." },
    { question: "Combien coutent les abonnements Goriya ?", tag: "Facturation", tagColor: "bg-red-100 text-red-600", answer: "Consultez la section \"Plans d'abonnement\" ci-dessus pour les tarifs a jour, ou la page Tarification pour le detail complet des forfaits." },
    { question: "L'offre gratuite est-elle vraiment sans paiement ?", tag: "Facturation", tagColor: "bg-red-100 text-red-600", answer: "Oui. Elle s'active directement depuis la page des forfaits, sans carte ni Mobile Money, et vous pouvez passer a un forfait payant a tout moment." },
]

const resources = [
    {
        Icon: BookOpen,
        title: "Guide de demarrage rapide",
        description: "Apprenez les bases de Goriya en 5 minutes",
        tag: "guide",
        duration: "5 min",
        content: [
            "1. Completez votre Profil entreprise (logo, secteur, description) : c'est la premiere chose qu'un candidat consulte avant de postuler.",
            "2. Publiez votre premiere offre depuis Poster une offre - titre, description, competences et questions de preselection eventuelles.",
            "3. Suivez les candidatures recues depuis Candidatures : filtrez par statut, consultez le score de compatibilite IA et le CV de chaque candidat.",
            "4. Echangez directement avec un candidat via la Messagerie, sans quitter la fiche de sa candidature.",
            "5. Une fois un candidat accepte, embauchez-le en un clic depuis Services RH > Employes : sa fiche est pre-remplie avec ses informations Goriya.",
        ],
    },
    {
        Icon: Video,
        title: "Maximiser l'efficacite de l'IA",
        description: "Optimiser le score de compatibilite et l'evaluation des candidats",
        tag: "guide",
        duration: "6 min",
        content: [
            "Le score de compatibilite affiche sur chaque candidature compare le profil du candidat aux exigences de votre offre : intitule, competences demandees et description. Plus votre offre est precise et detaillee, plus le score est fiable.",
            "Renseignez des competences specifiques plutot que generiques (\"React et TypeScript\" plutot que \"developpement web\") : l'IA s'appuie dessus pour comparer les CV.",
            "Depuis une fiche de candidature, lancez une Evaluation IA pour obtenir un score detaille (competences techniques, soft skills, adequation culturelle) et des questions d'entretien suggerees - utile avant de planifier un echange.",
            "Ajoutez vos notes d'echange avec le candidat avant de regenerer une evaluation : l'IA en tient compte pour affiner son analyse.",
        ],
    },
    {
        Icon: BookOpen,
        title: "Meilleures pratiques de recrutement",
        description: "Guide complet pour recruter efficacement sur Goriya",
        tag: "guide",
        duration: "8 min",
        content: [
            "Redigez des offres precises : intitule clair, missions concretes, competences requises et avantages. Les offres detaillees attirent des candidats plus qualifies et ameliorent la pertinence du score IA.",
            "Repondez rapidement : les candidats consultent le statut de leur candidature, un traitement rapide (acceptation, refus ou message) ameliore votre reputation aupres des talents.",
            "Utilisez les questions de preselection lors de la creation d'une offre pour filtrer en amont sur des criteres essentiels (disponibilite, mobilite, pretentions salariales...).",
            "Centralisez le suivi post-embauche dans Services RH : contrat, periode d'essai, conges et evaluations d'un meme employe restent lies a sa fiche.",
        ],
    },
    {
        Icon: FileCode,
        title: "API et integrations",
        description: "Documentation technique pour les developpeurs",
        tag: "docs",
        duration: "Variable",
        content: [
            "Les integrations API (synchronisation de vos offres et candidatures avec votre ATS ou votre site carriere) sont reservees aux forfaits Business et Business+.",
            "Depuis Integrations API, generez une cle d'acces pour authentifier vos appels et consultez les points d'entree disponibles (offres, candidatures, webhooks de statut).",
            "Pour un besoin d'integration non couvert par l'offre actuelle (volume eleve, connecteur specifique), contactez notre equipe via le formulaire ci-dessous : nous etudions les demandes sur mesure.",
        ],
    },
]

export default function AssistancePage() {
    const [openFaq, setOpenFaq] = useState<string | null>(null)
    const [plans, setPlans] = useState<Plan[]>([])
    const [plansLoading, setPlansLoading] = useState(true)
    // Filtre par catégorie : les cards « Parcourir par categorie » n'étaient
    // que décoratives. Elles pilotent maintenant la liste des questions.
    const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null)
    const [search, setSearch] = useState("")

    useEffect(() => {
        subscriptionService.getPlans("ENTREPRISE")
            .then((res) => {
                const data = (res as any)?.data ?? res ?? []
                setPlans(Array.isArray(data) ? data : [])
            })
            .catch(() => setPlans([]))
            .finally(() => setPlansLoading(false))
    }, [])

    // Compteurs réels, au lieu de nombres d'articles écrits en dur qui ne
    // correspondaient pas au contenu affiché.
    const countByCategory = faqs.reduce<Record<string, number>>((acc, faq) => {
        acc[faq.tag] = (acc[faq.tag] ?? 0) + 1
        return acc
    }, {})

    // Offre gratuite en premier, comme sur la page des forfaits.
    const sortedPlans = [...plans].sort((a, b) => Number(a.price) - Number(b.price))

    const normalizedSearch = search.trim().toLowerCase()
    const visibleFaqs = faqs.filter((faq) => {
        if (activeCategory && faq.tag !== activeCategory) return false
        if (!normalizedSearch) return true
        return (
            faq.question.toLowerCase().includes(normalizedSearch) ||
            faq.answer.toLowerCase().includes(normalizedSearch)
        )
    })

    const selectCategory = (id: CategoryId) => {
        // Re-cliquer sur la catégorie active la désélectionne.
        setActiveCategory((current) => (current === id ? null : id))
        setOpenFaq(null)
        document.getElementById("faq")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    return (
        <div className="min-h-screen bg-[#f4f5f7] font-sans">
            <AssistanceNav />

            <main className="mx-auto max-w-[900px] px-4 py-10 space-y-5">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Centre d'assistance</h1>
                    <p className="text-sm text-muted-foreground">Trouvez rapidement les reponses a vos questions</p>
                </div>

                <div className="overflow-hidden rounded-xl bg-brand-gradient px-4 py-8 text-center text-white sm:px-8 sm:py-10">
                    <h2 className="mb-1.5 text-xl font-bold">Comment pouvons-nous vous aider ?</h2>
                    <p className="mb-5 text-sm text-blue-200">Trouvez une reponse rapidement ou contactez notre equipe support</p>
                    <div className="relative mx-auto max-w-md">
                        <label htmlFor="assistance-search" className="sr-only">
                            Rechercher dans les questions frequentes
                        </label>
                        <Input
                            id="assistance-search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher une question..."
                            className="h-9 bg-white pl-4 pr-10 text-sm text-foreground"
                        />
                        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                </div>

                <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border bg-white sm:grid-cols-2 lg:grid-cols-3">
                    <Channel icon={<MessageSquare className="h-5 w-5 text-blue-500" />} title="Chat en direct" subtitle="Discutez avec notre equipe support">
                        <Button size="sm" className="rounded-full text-xs">Demarrer une conversation</Button>
                    </Channel>
                    <Channel icon={<Mail className="h-5 w-5 text-green-500" />} title="Email support" subtitle="Contactez-nous par email">
                        <a
                            href={SUPPORT_EMAIL_HREF}
                            className="font-medium text-blue-600 underline underline-offset-2 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        >
                            {SUPPORT_EMAIL}
                        </a>
                    </Channel>
                    <Channel icon={<Phone className="h-5 w-5 text-orange-400" />} title="Telephone" subtitle="Appelez notre support">
                        <a
                            href={SUPPORT_PHONE_HREF}
                            className="font-medium text-blue-600 underline underline-offset-2 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        >
                            {SUPPORT_PHONE}
                        </a>
                    </Channel>
                </div>

                <div className="rounded-xl border border-border bg-white p-4 sm:p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground">Parcourir par categorie</h3>
                        {activeCategory && (
                            <button
                                onClick={() => setActiveCategory(null)}
                                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            >
                                <X className="h-3 w-3" />
                                Tout afficher
                            </button>
                        )}
                    </div>

                    <div
                        role="group"
                        aria-label="Filtrer les questions par categorie"
                        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
                    >
                        {categories.map(({ id, label, Icon, bg }) => {
                            const isActive = activeCategory === id
                            const count = countByCategory[id] ?? 0

                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => selectCategory(id)}
                                    aria-pressed={isActive}
                                    aria-label={`Categorie ${label}, ${count} question${count > 1 ? "s" : ""}`}
                                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 active:scale-[0.99] ${
                                        isActive
                                            ? "bg-blue-50 ring-1 ring-blue-500"
                                            : "bg-muted/40 hover:bg-muted/70"
                                    }`}
                                >
                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                                        <Icon className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-sm font-medium ${isActive ? "text-blue-700" : "text-foreground"}`}>
                                            {label}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {count} question{count > 1 ? "s" : ""}
                                        </p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-white p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">Plans d'abonnement</h3>
                        <Link href="/tarification" className="text-xs font-medium text-blue-600 hover:underline">Voir tous les détails</Link>
                    </div>
                    {plansLoading ? (
                        <div className="flex justify-center py-6">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        </div>
                    ) : plans.length === 0 ? (
                        <p className="py-2 text-sm text-muted-foreground">Les forfaits ne sont pas disponibles pour le moment.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {sortedPlans.map((plan) => (
                                <div key={plan.id} className="rounded-lg border border-border bg-muted/20 p-4">
                                    <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                                    <p className="mt-1 mb-3">
                                        <span className="text-xl font-bold text-foreground">{Number(plan.price).toLocaleString("fr-FR")}</span>
                                        <span className="ml-1 text-xs text-muted-foreground">FCFA / {plan.billingPeriod === "ANNUAL" ? "an" : "mois"}</span>
                                    </p>
                                    <ul className="space-y-1.5">
                                        {plan.features.slice(0, 3).map((f, i) => (
                                            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                                <Check className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />{f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                            {/* Pas un forfait à prix fixe : contact direct plutôt qu'un
                                lien "Voir tous les détails" qui ne mènerait à rien de plus. */}
                            <div className="flex flex-col justify-between rounded-lg border border-dashed border-border bg-muted/20 p-4">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Sur mesure</p>
                                    <p className="mt-1 mb-3 text-xl font-bold text-foreground">Sur devis</p>
                                    <p className="text-xs text-muted-foreground">Grand compte ou besoins spécifiques : volumes, intégrations dédiées, accompagnement.</p>
                                </div>
                                <a href={SUPPORT_EMAIL_HREF} className="mt-3 text-xs font-medium text-blue-600 hover:underline">Nous contacter →</a>
                            </div>
                        </div>
                    )}
                </div>

                <div id="faq" className="scroll-mt-20 rounded-xl border border-border bg-white p-4 sm:p-5">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground">
                            {activeCategory ? `Questions - ${activeCategory}` : "Questions frequentes"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {visibleFaqs.length} question{visibleFaqs.length > 1 ? "s" : ""}
                        </p>
                    </div>

                    {visibleFaqs.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            Aucune question ne correspond a votre recherche.{" "}
                            <button
                                onClick={() => {
                                    setActiveCategory(null)
                                    setSearch("")
                                }}
                                className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700"
                            >
                                Reinitialiser les filtres
                            </button>
                        </p>
                    ) : (
                        <div className="divide-y divide-border">
                            {visibleFaqs.map((faq) => {
                                const isOpen = openFaq === faq.question
                                const panelId = `faq-panel-${faq.question.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`

                                return (
                                    <div key={faq.question}>
                                        <button
                                            type="button"
                                            onClick={() => setOpenFaq(isOpen ? null : faq.question)}
                                            aria-expanded={isOpen}
                                            aria-controls={panelId}
                                            className="flex w-full items-center justify-between gap-3 rounded-md py-3.5 text-left transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                        >
                                            <div className="flex flex-wrap items-center gap-3 pr-4">
                                                <span className="text-sm text-foreground">{faq.question}</span>
                                                <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${faq.tagColor}`}>
                                                    {faq.tag}
                                                </span>
                                            </div>
                                            <ChevronDown
                                                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                                            />
                                        </button>
                                        {isOpen && (
                                            <p id={panelId} className="pb-3.5 text-sm leading-relaxed text-muted-foreground">
                                                {faq.answer}
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-border bg-white p-4 sm:p-5">
                    <h3 className="mb-2 text-sm font-semibold text-foreground">Ressources utiles</h3>
                    <Accordion type="single" collapsible>
                        {resources.map(({ Icon, title, description, tag, duration, content }) => (
                            <AccordionItem key={title} value={title} className="border-border">
                                <AccordionTrigger className="py-4 hover:no-underline [&>svg]:shrink-0">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50"><Icon className="h-4 w-4 text-blue-500" /></div>
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-foreground">{title}</p>
                                            <p className="text-xs text-muted-foreground">{description}</p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
                                                <span className="text-[10px] text-muted-foreground">{duration}</span>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2.5 pl-[52px] text-sm leading-relaxed text-muted-foreground">
                                        {content.map((paragraph, i) => (
                                            <p key={i}>{paragraph}</p>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>

                <div className="rounded-xl border border-border bg-white py-8 text-center">
                    <Star className="mx-auto mb-3 h-7 w-7 text-yellow-400" fill="currentColor" />
                    <p className="mb-1 text-sm font-semibold text-foreground">Besoin d'aide personnalisee ?</p>
                    <p className="mb-5 text-xs text-muted-foreground">Notre equipe est la pour vous accompagner dans l'utilisation de Goriya</p>
                    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Button asChild size="sm" className="gap-1.5 rounded-full text-xs">
                            <a href={SUPPORT_EMAIL_HREF}>
                                <MessageSquare className="h-3.5 w-3.5" />
                                Ecrire au support
                            </a>
                        </Button>
                        <Button asChild size="sm" variant="ghost" className="gap-1.5 rounded-full text-xs text-muted-foreground">
                            <a href={SUPPORT_PHONE_HREF}>
                                <Phone className="h-3.5 w-3.5" />
                                {SUPPORT_PHONE}
                            </a>
                        </Button>
                    </div>
                </div>
            </main>

            <footer className="bg-[#06080d] text-white pt-10 pb-8 mt-4">
                <div className="mx-auto max-w-[1180px] px-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
                        <div>
                            <img src="/images/logo.png" alt="Goriya" className="h-10 w-auto brightness-0 invert mb-4" />
                            <p className="text-[13px] text-[#9098a7] leading-[1.7]">
                                Goriya est une plateforme web intelligente qui permet aux recruteurs de gérer leurs offres d'emploi et candidatures efficacement.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">Navigation</h4>
                            <AssistanceFooterLinks />
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">Contact</h4>
                            <ul className="space-y-2 text-[13px] text-[#9098a7]">
                                <li>
                                    <a href={SUPPORT_EMAIL_HREF} className="hover:text-white">
                                        {SUPPORT_EMAIL}
                                    </a>
                                </li>
                                <li>
                                    <a href={SUPPORT_PHONE_HREF} className="hover:text-white">
                                        {SUPPORT_PHONE}
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-[#1c202a] flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-[12px] text-[#6f7887]">2026 © Goriya. Tous droits réservés.</p>
                        <div className="flex items-center gap-2">
                            <AssistanceFooterActions />
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}

function Channel({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center px-6 py-6 text-center border-b border-border sm:[&:nth-child(2)]:border-l sm:[&:nth-child(2)]:border-r lg:border-b-0 lg:[&:nth-child(2)]:border-l lg:[&:nth-child(2)]:border-r">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">{icon}</div>
            <p className="mb-1 text-sm font-semibold text-foreground">{title}</p>
            <p className="mb-4 text-xs text-muted-foreground">{subtitle}</p>
            <div className="text-sm text-muted-foreground">{children}</div>
        </div>
    )
}
