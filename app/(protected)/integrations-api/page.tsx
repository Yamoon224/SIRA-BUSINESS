"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Trash2, Webhook as WebhookIcon, Copy, ChevronDown, ChevronRight, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { SubscriptionGate } from "@/components/subscription-gate"
import { apiClientService, WEBHOOK_EVENTS, type IApiClient, type IWebhook } from "@/lib/api/api-client.service"

function IntegrationsApiContent() {
    const [clients, setClients] = useState<IApiClient[]>([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState<string | null>(null)
    const [webhooksByClient, setWebhooksByClient] = useState<Record<string, IWebhook[]>>({})

    const [createOpen, setCreateOpen] = useState(false)
    const [newName, setNewName] = useState("")
    const [newSandbox, setNewSandbox] = useState(true)
    const [creating, setCreating] = useState(false)
    const [revealedToken, setRevealedToken] = useState<string | null>(null)

    const [webhookDialogFor, setWebhookDialogFor] = useState<string | null>(null)
    const [webhookUrl, setWebhookUrl] = useState("")
    const [webhookEvents, setWebhookEvents] = useState<string[]>([])
    const [creatingWebhook, setCreatingWebhook] = useState(false)
    const [revealedSecret, setRevealedSecret] = useState<string | null>(null)

    const load = async () => {
        setLoading(true)
        try {
            const res = await apiClientService.list()
            setClients(((res as any)?.data ?? res) as IApiClient[])
        } catch (err) {
            console.error("[integrations-api] load error:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const toggleExpand = async (client: IApiClient) => {
        if (expanded === client.id) {
            setExpanded(null)
            return
        }
        setExpanded(client.id)
        if (!webhooksByClient[client.id]) {
            try {
                const res = await apiClientService.listWebhooks(client.id)
                setWebhooksByClient((prev) => ({ ...prev, [client.id]: ((res as any)?.data ?? res) as IWebhook[] }))
            } catch (err) {
                console.error("[integrations-api] webhooks load error:", err)
            }
        }
    }

    const handleCreate = async () => {
        if (!newName.trim()) return
        setCreating(true)
        try {
            const res = await apiClientService.create(newName.trim(), newSandbox)
            const body = ((res as any)?.data ?? res) as { client: IApiClient; token: string }
            setClients((prev) => [body.client, ...prev])
            setRevealedToken(body.token)
            setNewName("")
            setNewSandbox(true)
        } catch (err) {
            console.error("[integrations-api] create error:", err)
            toast.error("Échec de la création de l'identifiant API")
        } finally {
            setCreating(false)
        }
    }

    const handleRevoke = async (id: string) => {
        try {
            await apiClientService.revoke(id)
            setClients((prev) => prev.filter((c) => c.id !== id))
        } catch (err) {
            console.error("[integrations-api] revoke error:", err)
        }
    }

    const handleCreateWebhook = async () => {
        if (!webhookDialogFor || !webhookUrl.trim() || webhookEvents.length === 0) return
        setCreatingWebhook(true)
        try {
            const res = await apiClientService.createWebhook(webhookDialogFor, webhookUrl.trim(), webhookEvents)
            const webhook = ((res as any)?.data ?? res) as IWebhook
            setWebhooksByClient((prev) => ({
                ...prev,
                [webhookDialogFor]: [webhook, ...(prev[webhookDialogFor] ?? [])],
            }))
            setRevealedSecret(webhook.secret ?? null)
            setWebhookUrl("")
            setWebhookEvents([])
        } catch (err) {
            console.error("[integrations-api] webhook create error:", err)
            toast.error("Échec de la création du webhook")
        } finally {
            setCreatingWebhook(false)
        }
    }

    const handleDeleteWebhook = async (clientId: string, webhookId: string) => {
        try {
            await apiClientService.deleteWebhook(clientId, webhookId)
            setWebhooksByClient((prev) => ({
                ...prev,
                [clientId]: (prev[clientId] ?? []).filter((w) => w.id !== webhookId),
            }))
        } catch (err) {
            console.error("[integrations-api] webhook delete error:", err)
        }
    }

    const copy = (value: string) => {
        navigator.clipboard.writeText(value)
        toast.success("Copié dans le presse-papier")
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Intégrations API (B2B)"
                description="Connectez vos outils ATS/SIRH à GORIYA via l'API externe et des webhooks sortants."
                actions={
                    <Button className="gap-1.5 bg-blue-500 hover:bg-blue-600" onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4" />Nouvel identifiant
                    </Button>
                }
            />

            {clients.length === 0 ? (
                <Card className="border border-border">
                    <CardContent className="p-12 text-center text-muted-foreground">
                        <KeyRound className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Aucun identifiant API. Créez-en un pour connecter un outil externe.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {clients.map((client) => (
                        <div key={client.id} className="rounded-xl border border-border bg-white">
                            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <button className="flex flex-1 items-center gap-2 text-left" onClick={() => toggleExpand(client)}>
                                    {expanded === client.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-foreground">{client.name}</p>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${client.isSandbox ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                                                {client.isSandbox ? "Sandbox" : "Production"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {client.rateLimitPerMinute} req/min · {client.lastUsedAt ? `dernière utilisation ${new Date(client.lastUsedAt).toLocaleString("fr-FR")}` : "jamais utilisé"}
                                        </p>
                                    </div>
                                </button>
                                <Button variant="ghost" size="sm" className="gap-1.5 text-red-500 hover:bg-red-50" onClick={() => handleRevoke(client.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />Révoquer
                                </Button>
                            </div>

                            {expanded === client.id && (
                                <div className="border-t border-border px-4 py-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Webhooks</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-1.5 text-xs"
                                            onClick={() => { setWebhookDialogFor(client.id); setWebhookUrl(""); setWebhookEvents([]) }}
                                        >
                                            <Plus className="h-3.5 w-3.5" />Ajouter un webhook
                                        </Button>
                                    </div>
                                    {(webhooksByClient[client.id] ?? []).length === 0 ? (
                                        <p className="text-xs text-muted-foreground">Aucun webhook configuré.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {(webhooksByClient[client.id] ?? []).map((webhook) => (
                                                <div key={webhook.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                                                    <div className="min-w-0">
                                                        <p className="flex items-center gap-1.5 truncate text-xs font-medium text-foreground">
                                                            <WebhookIcon className="h-3.5 w-3.5 shrink-0" />{webhook.url}
                                                        </p>
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {webhook.events.map((e) => (
                                                                <span key={e} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{e}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-red-500 hover:bg-red-50" onClick={() => handleDeleteWebhook(client.id, webhook.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Créer un identifiant API */}
            <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setRevealedToken(null) }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Nouvel identifiant API</DialogTitle></DialogHeader>
                    {revealedToken ? (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Copiez cette clé maintenant - elle ne sera plus jamais affichée.
                            </p>
                            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                                <code className="flex-1 truncate text-xs">{revealedToken}</code>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(revealedToken)}>
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <Button className="w-full" onClick={() => { setCreateOpen(false); setRevealedToken(null) }}>Terminé</Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-foreground">Nom</label>
                                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder='Ex : "Sync SAP SuccessFactors"' />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                                <span className="text-sm text-foreground">Mode sandbox (test)</span>
                                <Switch checked={newSandbox} onCheckedChange={setNewSandbox} />
                            </div>
                            <DialogFooter>
                                <Button disabled={creating || !newName.trim()} onClick={handleCreate} className="w-full bg-blue-500 hover:bg-blue-600">
                                    {creating ? "Création..." : "Créer"}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Créer un webhook */}
            <Dialog open={!!webhookDialogFor} onOpenChange={(open) => { if (!open) { setWebhookDialogFor(null); setRevealedSecret(null) } }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Nouveau webhook</DialogTitle></DialogHeader>
                    {revealedSecret ? (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Copiez ce secret maintenant - utilisez-le pour vérifier la signature HMAC des payloads reçus. Il ne sera plus jamais affiché.
                            </p>
                            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                                <code className="flex-1 truncate text-xs">{revealedSecret}</code>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(revealedSecret)}>
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <Button className="w-full" onClick={() => { setWebhookDialogFor(null); setRevealedSecret(null) }}>Terminé</Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-foreground">URL de destination</label>
                                <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://votre-systeme.example.com/webhooks/goriya" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-foreground">Événements</label>
                                <div className="space-y-1.5">
                                    {WEBHOOK_EVENTS.map((event) => (
                                        <label key={event} className="flex items-center gap-2 text-sm text-foreground">
                                            <Checkbox
                                                checked={webhookEvents.includes(event)}
                                                onCheckedChange={(checked) =>
                                                    setWebhookEvents((prev) => checked ? [...prev, event] : prev.filter((e) => e !== event))
                                                }
                                            />
                                            {event}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    disabled={creatingWebhook || !webhookUrl.trim() || webhookEvents.length === 0}
                                    onClick={handleCreateWebhook}
                                    className="w-full bg-blue-500 hover:bg-blue-600"
                                >
                                    {creatingWebhook ? "Création..." : "Créer le webhook"}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default function Page() {
    return (
        <SubscriptionGate feature="Intégration API" featureLabel="les intégrations API B2B">
            <IntegrationsApiContent />
        </SubscriptionGate>
    )
}
