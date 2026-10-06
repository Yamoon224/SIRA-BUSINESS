"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Video, Plus, PhoneOff, LogIn, Calendar, Mail, Users, X } from "lucide-react"
import { SubscriptionGate } from "@/components/subscription-gate"
import { callSessionService, type ICallSession, type CallSessionStatus } from "@/lib/api/call-session.service"
import { CallEmbed } from "@/components/call-embed"
import { extractApiErrorMessage } from "@/lib/api-error"

const MAX_INVITES = 20

const estEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const STATUS_META: Record<CallSessionStatus, { label: string; className: string }> = {
    SCHEDULED: { label: "Planifié", className: "bg-blue-100 text-blue-600" },
    ACTIVE: { label: "En cours", className: "bg-green-500 text-white" },
    ENDED: { label: "Terminé", className: "bg-gray-200 text-gray-700" },
}

function AppelsContent() {
    const { data: session } = useSession()
    const [sessions, setSessions] = useState<ICallSession[]>([])
    const [loading, setLoading] = useState(true)

    const [createOpen, setCreateOpen] = useState(false)
    const [title, setTitle] = useState("")
    const [scheduledAt, setScheduledAt] = useState("")
    const [invitees, setInvitees] = useState<string[]>([])
    const [inviteeDraft, setInviteeDraft] = useState("")
    const [description, setDescription] = useState("")
    const [creating, setCreating] = useState(false)
    /** Lien d'invitation (`/appels?rejoindre=<id>`) : traité une seule fois. */
    const lienTraite = useRef(false)

    const [joiningId, setJoiningId] = useState<string | null>(null)
    const [activeCall, setActiveCall] = useState<{ session: ICallSession; token: string; url: string; room: string } | null>(null)

    const load = async () => {
        setLoading(true)
        try {
            const res = await callSessionService.list()
            setSessions(((res as any)?.data ?? res) as ICallSession[])
        } catch (err) {
            console.error("[appels] load error:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    /**
     * Ajoute les adresses saisies (séparées par virgule, point-virgule ou
     * espace, pour accepter un collage). Renvoie la liste à jour, ou `null`
     * si une adresse est invalide.
     */
    const ajouterInvites = (saisie: string): string[] | null => {
        const adresses = saisie.split(/[\s,;]+/).map((a) => a.trim().toLowerCase()).filter(Boolean)
        if (adresses.length === 0) return invitees
        const invalide = adresses.find((a) => !estEmail(a))
        if (invalide) {
            toast.error(`« ${invalide} » n'est pas une adresse email valide.`)
            return null
        }
        const suivants = Array.from(new Set([...invitees, ...adresses]))
        if (suivants.length > MAX_INVITES) {
            toast.error(`${MAX_INVITES} invités au maximum par appel.`)
            return null
        }
        setInvitees(suivants)
        setInviteeDraft("")
        return suivants
    }

    const handleCreate = async () => {
        if (!title.trim()) return
        // Une adresse encore dans le champ compte aussi : on ne la perd pas.
        const destinataires = ajouterInvites(inviteeDraft)
        if (destinataires === null) return

        setCreating(true)
        try {
            const newSession = await callSessionService.schedule(
                title.trim(),
                scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
                destinataires,
                description.trim() || undefined,
            )
            const body = ((newSession as any)?.data ?? newSession) as ICallSession
            setSessions((prev) => [body, ...prev])
            setCreateOpen(false)
            setTitle("")
            setScheduledAt("")
            setInvitees([])
            setInviteeDraft("")
            setDescription("")
            toast.success(
                destinataires.length > 0
                    ? `Appel planifié - invitation envoyée à ${destinataires.length} personne${destinataires.length > 1 ? "s" : ""}.`
                    : "Appel planifié.",
            )
        } catch (err) {
            console.error("[appels] create error:", err)
            toast.error(extractApiErrorMessage(err, "La planification de l'appel a échoué."))
        } finally {
            setCreating(false)
        }
    }

    const handleJoin = async (callSession: ICallSession) => {
        setJoiningId(callSession.id)
        try {
            const res = await callSessionService.join(callSession.id)
            const body = (res as any)?.data ?? res
            setActiveCall({ session: callSession, token: body.token, url: body.url, room: body.room })
            setSessions((prev) => prev.map((s) => s.id === callSession.id ? { ...s, status: "ACTIVE" } : s))
        } catch (err) {
            console.error("[appels] join error:", err)
            toast.error("Impossible de rejoindre cet appel : il est peut-être terminé.")
        } finally {
            setJoiningId(null)
        }
    }

    const handleEnd = async (callSession: ICallSession) => {
        try {
            await callSessionService.end(callSession.id)
            setSessions((prev) => prev.map((s) => s.id === callSession.id ? { ...s, status: "ENDED" } : s))
            if (activeCall?.session.id === callSession.id) setActiveCall(null)
        } catch (err) {
            console.error("[appels] end error:", err)
        }
    }

    // Arrivée depuis le bouton « Rejoindre l'appel » de l'email d'invitation.
    useEffect(() => {
        if (loading || lienTraite.current) return
        lienTraite.current = true
        const id = new URLSearchParams(window.location.search).get("rejoindre")
        if (!id) return
        window.history.replaceState(null, "", window.location.pathname)

        const connue = sessions.find((s) => s.id === id)
        if (connue) {
            if (connue.status !== "ENDED") handleJoin(connue)
            else toast.error("Cet appel est terminé.")
            return
        }
        callSessionService
            .get(id)
            .then((res) => {
                const session = ((res as any)?.data ?? res) as ICallSession
                if (session.status === "ENDED") {
                    toast.error("Cet appel est terminé.")
                    return
                }
                setSessions((prev) => [session, ...prev])
                handleJoin(session)
            })
            .catch(() => toast.error("Appel introuvable."))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading])

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
                title="Goriya Meet"
                description="Planifiez vos entretiens et réunions en visioconférence sur GORIYA Meet (Lunion Meet) et retrouvez-en l'historique. Les entretiens vidéo planifiés depuis Recrutements y apparaissent aussi."
                actions={
                    <Button className="gap-1.5 bg-blue-500 hover:bg-blue-600" onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4" />Planifier un appel
                    </Button>
                }
            />

            {sessions.length === 0 ? (
                <Card className="border border-border">
                    <CardContent className="p-12 text-center text-muted-foreground">
                        <Video className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Aucun appel planifié.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {sessions.map((callSession) => (
                        <div key={callSession.id} className="rounded-2xl border border-border bg-white px-4 py-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-foreground">{callSession.title}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_META[callSession.status].className}`}>
                                            {STATUS_META[callSession.status].label}
                                        </span>
                                    </div>

                                    {/* Un appel lancé sans date planifiée affiche celle de sa création. */}
                                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                                        {callSession.scheduledAt ? "Prévu le " : "Créé le "}
                                        {new Date(callSession.scheduledAt ?? callSession.createdAt).toLocaleString("fr-FR", {
                                            weekday: "short",
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>

                                    {callSession.invitees && callSession.invitees.length > 0 && (
                                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground" title={callSession.invitees.join(", ")}>
                                            <Users className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">
                                                {callSession.invitees.length} invité{callSession.invitees.length > 1 ? "s" : ""} : {callSession.invitees.join(", ")}
                                            </span>
                                        </p>
                                    )}

                                    {callSession.isHost === false && callSession.hostName && (
                                        <p className="mt-1 text-xs text-muted-foreground">Organisé par {callSession.hostName}</p>
                                    )}
                                </div>

                                {callSession.status !== "ENDED" && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            className="h-9 gap-1.5 bg-blue-500 text-xs hover:bg-blue-600"
                                            disabled={joiningId === callSession.id}
                                            onClick={() => handleJoin(callSession)}
                                        >
                                            <LogIn className="h-3.5 w-3.5" />
                                            {joiningId === callSession.id ? "Connexion..." : "Rejoindre"}
                                        </Button>
                                        {callSession.isHost !== false && (
                                            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs text-red-500 hover:bg-red-50" onClick={() => handleEnd(callSession)}>
                                                <PhoneOff className="h-3.5 w-3.5" />Clôturer
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
                                <Video className="h-4 w-4" />
                            </span>
                            Planifier un appel vidéo
                        </DialogTitle>
                        <DialogDescription>Les personnes invitées reçoivent le programme par email, avec le lien pour rejoindre l&apos;appel.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="call-title" className="mb-1 block text-xs font-medium text-foreground">Titre de l&apos;appel *</label>
                            <Input id="call-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Entretien avec Awa Diallo" maxLength={250} />
                        </div>

                        <div>
                            <label htmlFor="call-date" className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                Date et heure
                            </label>
                            <Input id="call-date" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                            <p className="mt-1 text-left text-[11px] text-muted-foreground">Laisse vide pour démarrer l&apos;appel tout de suite.</p>
                        </div>

                        <div>
                            <label htmlFor="call-invitees" className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                Inviter des personnes
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    id="call-invitees"
                                    type="email"
                                    value={inviteeDraft}
                                    onChange={(e) => setInviteeDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === "," || e.key === ";") {
                                            e.preventDefault()
                                            ajouterInvites(inviteeDraft)
                                        }
                                    }}
                                    onPaste={(e) => {
                                        const colle = e.clipboardData.getData("text")
                                        if (/[\s,;]/.test(colle.trim())) {
                                            e.preventDefault()
                                            ajouterInvites(colle)
                                        }
                                    }}
                                    placeholder="adresse@email.com"
                                    className="min-w-0 flex-1"
                                />
                                <Button type="button" variant="outline" disabled={!inviteeDraft.trim()} onClick={() => ajouterInvites(inviteeDraft)}>
                                    Ajouter
                                </Button>
                            </div>
                            {invitees.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {invitees.map((email) => (
                                        <span key={email} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-2.5 pr-1.5 text-xs text-blue-700">
                                            <span className="truncate">{email}</span>
                                            <button
                                                type="button"
                                                onClick={() => setInvitees((prev) => prev.filter((e) => e !== email))}
                                                aria-label={`Retirer ${email}`}
                                                className="shrink-0 rounded-full p-0.5 hover:bg-white/70"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-1 text-left text-[11px] text-muted-foreground">Appuie sur Entrée après chaque adresse. Tu peux aussi coller une liste.</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="call-description" className="mb-1 block text-xs font-medium text-foreground">Message aux invités (optionnel)</label>
                            <Textarea
                                id="call-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ordre du jour, documents à préparer..."
                                maxLength={1000}
                                className="min-h-[70px]"
                            />
                        </div>

                        <DialogFooter>
                            <Button disabled={creating || !title.trim()} onClick={handleCreate} className="w-full bg-blue-500 hover:bg-blue-600">
                                {creating
                                    ? invitees.length > 0 ? "Envoi des invitations..." : "Création..."
                                    : invitees.length > 0
                                        ? `Planifier et inviter ${invitees.length} personne${invitees.length > 1 ? "s" : ""}`
                                        : "Planifier"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {activeCall && (
                <CallEmbed
                    token={activeCall.token}
                    url={activeCall.url}
                    room={activeCall.room}
                    name={session?.user?.name ?? "Entreprise"}
                    title={activeCall.session.title}
                    onClose={() => setActiveCall(null)}
                />
            )}
        </div>
    )
}

export default function Page() {
    return (
        <SubscriptionGate requiredTier="PAID" featureLabel="les Goriya Meet">
            <AppelsContent />
        </SubscriptionGate>
    )
}
