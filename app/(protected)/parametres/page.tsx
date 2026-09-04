"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, Save, Smartphone } from "lucide-react"
import { apiRequest } from "@/lib/api-client-http"

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
        setSaving(true)
        try {
            await apiRequest({
                endpoint: `/users/${userId}`,
                method: "PATCH",
                data: { name: `${firstName} ${lastName}`.trim(), email, phone },
            })
        } catch (err) {
            console.error("[parametres] save error:", err)
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
        <div className="space-y-5 pb-12">
            <div>
                <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Parametres</h1>
                <p className="text-sm text-muted-foreground">Gerez vos preferences et parametres de compte</p>
            </div>

            <Section title="Informations du compte">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Prenom"><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Votre prénom" /></Field>
                    <Field label="Nom"><Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Votre nom" /></Field>
                    <Field label="Adresse email"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse e-mail" /></Field>
                    <Field label="Telephone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6 00 00 00 00" /></Field>
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
                            <p className="font-bold">Plan Premium</p>
                            <p className="text-xs text-blue-200">Acces a toutes les fonctionnalites IA</p>
                        </div>
                        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium text-white">Actif</span>
                    </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" size="sm">Gerer l'abonnement</Button>
                    <Button variant="outline" size="sm">Historique des factures</Button>
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
                <Button className="gap-2 rounded-full bg-primary px-6 text-white hover:bg-primary/90" onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4" />
                    {saving ? "Enregistrement…" : "Enregistrer les modifications"}
                </Button>
            </div>
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
