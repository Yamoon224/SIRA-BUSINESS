"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { PhoneInput, telephoneValide } from "@/components/phone-input"
import { AlertTriangle, CreditCard, Loader2, Receipt, Save, Smartphone } from "lucide-react"
import { apiRequest } from "@/lib/api-client-http"
import { extractApiErrorMessage } from "@/lib/api-error"
import { subscriptionService, type ITransaction } from "@/lib/api/subscription.service"

interface IMySubscription {
    id: string
    status: "ACTIVE" | "EXPIRED" | "CANCELLED"
    startDate: string
    endDate: string | null
    autoRenew: boolean
    plan: { id: string; name: string; price: number; billingPeriod: "MONTHLY" | "ANNUAL" } | null
}

/** Variante « bandeau » (fond dégradé) : même badge translucide pour les trois statuts. */
const STATUT_ABONNEMENT: Record<IMySubscription["status"], { label: string; className: string }> = {
    ACTIVE: { label: "Actif", className: "bg-white/20 text-white" },
    EXPIRED: { label: "Expiré", className: "bg-white/20 text-white" },
    CANCELLED: { label: "Annulé", className: "bg-white/20 text-white" },
}

/** Variante « modale » (fond clair) du même statut. */
const STATUT_ABONNEMENT_MODALE: Record<IMySubscription["status"], string> = {
    ACTIVE: "bg-green-100 text-green-600",
    EXPIRED: "bg-orange-100 text-orange-500",
    CANCELLED: "bg-gray-100 text-gray-500",
}

const STATUT_TRANSACTION: Record<ITransaction["status"], { label: string; className: string }> = {
    SUCCESS: { label: "Payée", className: "bg-green-100 text-green-600" },
    PENDING: { label: "En attente", className: "bg-orange-100 text-orange-500" },
    FAILED: { label: "Échouée", className: "bg-red-100 text-red-500" },
    REFUNDED: { label: "Remboursée", className: "bg-gray-100 text-gray-500" },
}

export default function ParametresPage() {
    // ✅ La session NextAuth (cookie httpOnly) est l'unique source de vérité côté client.
    // Les appels API du navigateur passent par /api/proxy, qui attache le Bearer token
    // à partir de cette même session côté serveur : plus besoin de lire un token ici.
    const { data: session } = useSession()
    const userId = session?.user?.id
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [role, setRole] = useState("")
    const [notifEmail, setNotifEmail] = useState(true)
    const [notifPush, setNotifPush] = useState(true)
    const [notifWeekly, setNotifWeekly] = useState(false)

    // Abonnement actif : alimente le bandeau et les modales « Gérer
    // l'abonnement » / « Historique des factures ». `null` = aucun abonnement,
    // `undefined` = pas encore chargé.
    const [subscription, setSubscription] = useState<IMySubscription | null | undefined>(undefined)
    const [subDialogOpen, setSubDialogOpen] = useState(false)
    const [cancelling, setCancelling] = useState(false)

    const [invoicesOpen, setInvoicesOpen] = useState(false)
    const [transactions, setTransactions] = useState<ITransaction[] | null>(null)
    const [transactionsLoading, setTransactionsLoading] = useState(false)
    const [transactionsError, setTransactionsError] = useState<string | null>(null)

    useEffect(() => {
        if (!userId) return
        subscriptionService
            .getMySubscription(userId)
            .then((res: any) => setSubscription((res as any)?.data ?? res ?? null))
            .catch((err) => {
                console.error("[parametres] getMySubscription error:", err)
                setSubscription(null)
            })
    }, [userId])

    const handleCancelSubscription = async () => {
        if (!userId) return
        setCancelling(true)
        try {
            await subscriptionService.cancelSubscription(userId)
            setSubscription(null)
            toast.success("Abonnement annulé.")
        } catch (err) {
            console.error("[parametres] cancelSubscription error:", err)
            toast.error(extractApiErrorMessage(err, "L'annulation de l'abonnement a échoué."))
        } finally {
            setCancelling(false)
        }
    }

    const openInvoices = async () => {
        setInvoicesOpen(true)
        if (transactions !== null || !userId) return
        setTransactionsLoading(true)
        setTransactionsError(null)
        try {
            const res = await subscriptionService.getTransactions(userId)
            const items = (res as any)?.data ?? res ?? []
            setTransactions(Array.isArray(items) ? items : [])
        } catch (err) {
            console.error("[parametres] getTransactions error:", err)
            setTransactionsError("Impossible de charger l'historique des factures pour le moment.")
        } finally {
            setTransactionsLoading(false)
        }
    }

    useEffect(() => {
        if (!userId) { setLoading(false); return }
        const load = async () => {
            try {
                const res = await apiRequest<any>({ endpoint: `/users/${userId}`, method: "GET" })
                const user = (res as any)?.data ?? res
                if (user) {
                    const parts = (user.name ?? "").split(" ")
                    setFirstName(parts[0] ?? "")
                    setLastName(parts.slice(1).join(" ") ?? "")
                    setEmail(user.email ?? "")
                    setPhone(user.phone ?? "")
                    setRole(user.role ?? "")
                }
            } catch (err) {
                console.error("[parametres] load error:", err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [userId])

    const handleSave = async () => {
        if (!userId) return

        // Un numéro incomplet part sinon en base sans que rien ne le signale.
        if (phone && !telephoneValide(phone)) {
            toast.error("Le numéro de téléphone semble incomplet.")
            return
        }

        setSaving(true)
        try {
            await apiRequest({
                endpoint: `/users/${userId}`,
                method: "PATCH",
                data: { name: `${firstName} ${lastName}`.trim(), email, phone },
            })
            toast.success("Paramètres enregistrés.")
        } catch (err) {
            console.error("[parametres] save error:", err)
            toast.error(extractApiErrorMessage(err, "L'enregistrement a échoué."))
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-12">
            <PageHeader
                title="Paramètres"
                description="Gérez les informations de votre compte, vos préférences de notification et la sécurité de votre accès."
            />

            <Section title="Informations du compte">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Prenom"><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Votre prénom" /></Field>
                    <Field label="Nom"><Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Votre nom" /></Field>
                    <Field label="Adresse email"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse e-mail" /></Field>
                    <Field label="Telephone"><PhoneInput value={phone} onChange={setPhone} /></Field>
                    <Field label="Fonction" className="md:col-span-2"><Input value={role} readOnly className="bg-muted/30" /></Field>
                </div>
            </Section>

            <Section title="Notifications">
                <div className="divide-y divide-border">
                    <NotifRow label="Notifications par email" description="Recevoir des notifications sur les nouvelles candidatures" checked={notifEmail} onChange={setNotifEmail} />
                    <NotifRow label="Notifications push" description="Recevoir des notifications push sur votre navigation" checked={notifPush} onChange={setNotifPush} />
                    <NotifRow label="Rapports hebdomadaires" description="Recevoir un resume hebdomadaire de vos recrutements" checked={notifWeekly} onChange={setNotifWeekly} />
                </div>
                <div className="mt-4">
                    <p className="mb-1.5 text-sm text-muted-foreground">Frequence des notifications</p>
                    <Select defaultValue="instantane">
                        <SelectTrigger className="w-full md:w-[300px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="instantane">Instantane</SelectItem>
                            <SelectItem value="quotidien">Quotidien</SelectItem>
                            <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Section>

            <Section title="Confidentialite et securite">
                <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Changer le mot de passe</p>
                    <Input type="password" placeholder="Mot de passe actuel" />
                    <Input type="password" placeholder="Nouveau mot de passe" />
                    <Input type="password" placeholder="Confirmer le nouveau mot de passe" />
                    <Button variant="outline" size="sm">Mettre a jour le mot de passe</Button>
                </div>

                <div className="mt-6 rounded-lg border border-border p-3">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-foreground">Authentification a deux facteurs</p>
                            <p className="text-xs text-muted-foreground">Securisez votre compte</p>
                        </div>
                        <span className="rounded-full border border-orange-300 bg-orange-50 px-2.5 py-0.5 text-xs text-orange-500 w-fit">Non configure</span>
                    </div>
                    <button className="inline-flex items-center gap-2 rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-gray-50 transition-colors">
                        <Smartphone className="h-3.5 w-3.5" />
                        Configurer 2FA
                    </button>
                </div>
            </Section>

            <Section title="Abonnement et facturation">
                <div className="rounded-xl bg-brand-gradient px-4 py-4 text-white sm:px-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="font-bold">
                                {subscription === undefined ? "Chargement…" : subscription?.plan?.name ?? "Aucun abonnement"}
                            </p>
                            <p className="text-xs text-blue-200">
                                {subscription
                                    ? "Accès aux fonctionnalités incluses dans ce forfait"
                                    : subscription === null
                                      ? "L'offre gratuite reste active pour l'essentiel de l'espace recrutement"
                                      : ""}
                            </p>
                        </div>
                        {subscription && (
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUT_ABONNEMENT[subscription.status].className}`}>
                                {STATUT_ABONNEMENT[subscription.status].label}
                            </span>
                        )}
                    </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSubDialogOpen(true)}>
                        <CreditCard className="h-3.5 w-3.5" />
                        Gerer l'abonnement
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={openInvoices}>
                        <Receipt className="h-3.5 w-3.5" />
                        Historique des factures
                    </Button>
                </div>
            </Section>

            <Section title="Langue et region">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <p className="mb-1.5 text-sm text-muted-foreground">Langue de l'interface</p>
                        <Select defaultValue="fr"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fr">Francais</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select>
                    </div>
                    <div>
                        <p className="mb-1.5 text-sm text-muted-foreground">Fuseau horaire</p>
                        <Select defaultValue="africa-abidjan"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="africa-abidjan">Africa/Abidjan</SelectItem><SelectItem value="europe-paris">Europe/Paris</SelectItem></SelectContent></Select>
                    </div>
                </div>
            </Section>

            <div className="rounded-xl border border-red-200 bg-red-50/40 p-5">
                <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold text-red-600">Zone dangereuse</h2><AlertTriangle className="h-4 w-4 text-red-400" /></div>
                <p className="mb-1 text-sm font-medium text-foreground">Supprimer le compte</p>
                <p className="mb-4 text-xs text-muted-foreground">Une fois supprime, votre compte ne peut pas etre recupere. Toutes vos donnees seront perdues.</p>
                <Button size="sm" className="bg-red-500 text-white hover:bg-red-600">Supprimer le compte</Button>
            </div>

            <div className="flex justify-center pt-1">
                <Button className="gap-2 rounded-full bg-brand-gradient px-6 text-white hover:bg-brand-gradient/90" onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4" />
                    {saving ? "Enregistrement…" : "Enregistrer les modifications"}
                </Button>
            </div>

            {/* ── Gérer l'abonnement ── */}
            <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Gérer l'abonnement</DialogTitle>
                        <DialogDescription>Votre forfait actuel et sa facturation.</DialogDescription>
                    </DialogHeader>

                    {subscription === undefined ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        </div>
                    ) : subscription ? (
                        <div className="space-y-4 text-sm">
                            <div className="rounded-lg border border-border p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="font-semibold text-foreground">{subscription.plan?.name ?? "Forfait"}</p>
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUT_ABONNEMENT_MODALE[subscription.status]}`}>
                                        {STATUT_ABONNEMENT[subscription.status].label}
                                    </span>
                                </div>
                                <p className="mt-1 text-muted-foreground">
                                    {subscription.plan
                                        ? `${Number(subscription.plan.price).toLocaleString("fr-FR")} FCFA / ${subscription.plan.billingPeriod === "ANNUAL" ? "an" : "mois"}`
                                        : "Tarif non disponible"}
                                </p>
                                <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                                    <p>Débuté le {new Date(subscription.startDate).toLocaleDateString("fr-FR")}</p>
                                    {subscription.endDate && (
                                        <p>{subscription.status === "ACTIVE" ? "Renouvellement le " : "Terminé le "}{new Date(subscription.endDate).toLocaleDateString("fr-FR")}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button asChild variant="outline" size="sm" className="flex-1">
                                    <Link href="/tarification" target="_blank">Changer de forfait</Link>
                                </Button>
                                {subscription.status === "ACTIVE" && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-600" disabled={cancelling}>
                                                {cancelling ? "Annulation…" : "Annuler l'abonnement"}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Annuler l'abonnement ?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Votre accès aux fonctionnalités payantes s'arrêtera. Cette action est irréversible ; vous pourrez souscrire à nouveau à tout moment.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Garder mon abonnement</AlertDialogCancel>
                                                <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleCancelSubscription}>
                                                    Confirmer l'annulation
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 text-sm">
                            <p className="text-muted-foreground">
                                Aucun abonnement payant actif. L'offre gratuite vous donne déjà accès à l'essentiel de l'espace recrutement.
                            </p>
                            <Button asChild size="sm" className="w-full bg-brand-gradient text-white">
                                <Link href="/tarification" target="_blank">Voir les forfaits</Link>
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Historique des factures ── */}
            <Dialog open={invoicesOpen} onOpenChange={setInvoicesOpen}>
                <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Historique des factures</DialogTitle>
                        <DialogDescription>Vos tentatives de paiement, la plus récente en premier.</DialogDescription>
                    </DialogHeader>

                    {transactionsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        </div>
                    ) : transactionsError ? (
                        <p className="py-4 text-sm text-destructive">{transactionsError}</p>
                    ) : !transactions || transactions.length === 0 ? (
                        <p className="py-4 text-sm text-muted-foreground">Aucune facture pour le moment.</p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {transactions.map((tx) => (
                                <li key={tx.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-foreground">{tx.planName ?? "Abonnement"}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(tx.createdAt).toLocaleDateString("fr-FR")} · {tx.gateway}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <span className="font-semibold text-foreground">
                                            {Number(tx.amount).toLocaleString("fr-FR")} {tx.currency}
                                        </span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUT_TRANSACTION[tx.status].className}`}>
                                            {STATUT_TRANSACTION[tx.status].label}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-border bg-white p-4 md:p-6">
            <h2 className="mb-4 text-sm font-semibold text-foreground">{title}</h2>
            {children}
        </div>
    )
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <p className="mb-1 text-xs text-muted-foreground">{label}</p>
            {children}
        </div>
    )
}

function NotifRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between gap-4 py-4">
            <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    )
}
