"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Search,
    Paperclip,
    Send,
    Star,
    Trash2,
    MoreHorizontal,
    Loader2,
    X,
    FileText,
    MailOpen,
    RefreshCw,
    Video,
    ChevronLeft,
} from "lucide-react"
import {
    getConversations,
    getMessages,
    sendMessage,
    sendAttachment,
    markRead,
    markUnread,
    starConversation,
    deleteConversation,
    scheduleCallSession,
} from "@/actions/messages"
import { extractApiErrorMessage } from "@/lib/api-error"
import { FileViewerDialog, type ViewableFile } from "@/components/file-viewer-dialog"
import { cn } from "@/lib/utils"

type Conversation = { id: string; otherUserId: string | null; name: string; title: string | null; avatar: string | null; time: string; unread: number; lastMessage: string; starred: boolean }
type Attachment = { name: string; url: string; mimeType: string | null; size: number | null }
type Message = { id: string; content: string; time: string; isMe: boolean; attachment: Attachment | null; pending?: boolean }

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024

function initials(name: string): string {
    return name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

function mapConversation(raw: any): Conversation {
    return {
        id: String(raw.id ?? raw._id ?? ""),
        otherUserId: raw.otherUserId ? String(raw.otherUserId) : null,
        name: raw.name ?? raw.participantName ?? raw.candidate?.name ?? "-",
        // Intitulé professionnel du candidat (ex. "Développeuse Web"), pas le
        // rôle technique du compte (USER/ADMIN/ENTERPRISE) — sans intérêt ici.
        title: raw.title ?? null,
        avatar: raw.avatar ?? null,
        time: raw.lastMessageAt ? new Date(raw.lastMessageAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "-",
        unread: raw.unreadCount ?? 0,
        lastMessage: raw.lastMessage ?? raw.preview ?? "",
        starred: raw.starred === true,
    }
}

function mapMessage(raw: any, currentUserId: string): Message {
    return {
        id: String(raw.id ?? raw._id ?? ""),
        content: raw.content ?? raw.text ?? "",
        time: raw.createdAt ? new Date(raw.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : raw.time ?? "",
        isMe: raw.senderId === currentUserId || raw.isMe === true,
        attachment: raw.attachment?.url ? raw.attachment : null,
    }
}

function formatSize(bytes: number | null): string {
    if (!bytes || bytes <= 0) return ""
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function MessagesContent() {
    const { data: session, status } = useSession()
    const searchParams = useSearchParams()
    const conversationParam = searchParams.get("conversation")
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selected, setSelected] = useState<Conversation | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)
    // Sur mobile, on ne montre jamais la liste et la conversation à la fois :
    // un panneau à la fois, comme sur l'espace candidat.
    const [showMobileList, setShowMobileList] = useState(true)
    const userId = session?.user?.id ?? ""

    // Pièce jointe : choisie puis envoyée avec (ou sans) le texte en cours.
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [pendingFile, setPendingFile] = useState<File | null>(null)
    const [sending, setSending] = useState(false)

    const [confirmDelete, setConfirmDelete] = useState<Conversation | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [viewedFile, setViewedFile] = useState<ViewableFile | null>(null)

    // Planifier un Goriya Meet depuis la conversation en cours.
    const [meetOpen, setMeetOpen] = useState(false)
    const [meetTitle, setMeetTitle] = useState("")
    const [meetDate, setMeetDate] = useState("")
    const [scheduling, setScheduling] = useState(false)

    useEffect(() => {
        if (status === "loading") return
        if (!session?.user) { setLoading(false); return }

        getConversations()
            .then((res) => {
                const items = (res as any)?.data ?? res ?? []
                const convs = Array.isArray(items) ? items.map(mapConversation) : []
                setConversations(convs)
                const toSelect = (conversationParam && convs.find((c) => c.id === conversationParam)) || convs[0]
                if (toSelect) {
                    setSelected(toSelect)
                    loadMessages(toSelect.id)
                }
            })
            .catch((err) => console.error("[messages] conversations error:", err))
            .finally(() => setLoading(false))
    }, [status, session, conversationParam])

    const loadMessages = async (convId: string) => {
        try {
            await markRead(convId)
            const res = await getMessages(convId)
            const items = (res as any)?.data ?? res ?? []
            setMessages(Array.isArray(items) ? items.map((m: any) => mapMessage(m, userId)) : [])
        } catch (err) {
            console.error("[messages] load messages error:", err)
        }
    }

    const handleSelectConv = (conv: Conversation) => {
        setSelected(conv)
        setShowMobileList(false)
        setPendingFile(null)
        loadMessages(conv.id)
        setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, unread: 0 } : c))
    }

    const handlePickFile = (file: File | undefined) => {
        if (!file) return
        if (file.size > MAX_ATTACHMENT_BYTES) {
            toast.error(`« ${file.name} » dépasse 8 Mo. Choisissez un fichier plus léger.`)
            return
        }
        setPendingFile(file)
    }

    /**
     * Un seul chemin d'envoi pour le texte et le fichier : le message part en
     * multipart dès qu'une pièce jointe est en attente, sinon en JSON.
     */
    const handleSend = async () => {
        const contenu = newMessage.trim()
        if ((!contenu && !pendingFile) || !selected || sending) return

        const fichier = pendingFile
        const optimistic: Message = {
            id: `opt-${Date.now()}`,
            content: contenu,
            time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
            isMe: true,
            attachment: fichier ? { name: fichier.name, url: "", mimeType: fichier.type, size: fichier.size } : null,
            pending: !!fichier,
        }
        setMessages((prev) => [...prev, optimistic])
        setNewMessage("")
        setPendingFile(null)
        setSending(true)

        try {
            const res = fichier
                ? await sendAttachment(selected.id, fichier, contenu)
                : await sendMessage(selected.id, contenu)
            const envoye = (res as any)?.data ?? res
            // Le message renvoyé porte l'URL réelle de la pièce jointe : on
            // remplace l'optimiste plutôt que de laisser un lien mort.
            if (envoye?.id) {
                setMessages((prev) => prev.map((m) => m.id === optimistic.id ? mapMessage(envoye, userId) : m))
            }
            setConversations((prev) => prev.map((c) => c.id === selected.id
                ? { ...c, lastMessage: contenu || `Pièce jointe : ${fichier?.name ?? ""}` }
                : c))
        } catch (err) {
            console.error("[messages] send error:", err)
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
            setNewMessage(contenu)
            setPendingFile(fichier)
            toast.error(extractApiErrorMessage(err, "L'envoi du message a échoué."))
        } finally {
            setSending(false)
        }
    }

    const handleToggleStar = async () => {
        if (!selected) return
        const suivant = !selected.starred
        setSelected({ ...selected, starred: suivant })
        setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, starred: suivant } : c))
        try {
            await starConversation(selected.id, suivant)
            toast.success(suivant ? "Conversation épinglée." : "Conversation retirée des épinglées.")
        } catch (err) {
            console.error("[messages] star error:", err)
            setSelected({ ...selected, starred: !suivant })
            setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, starred: !suivant } : c))
            toast.error(extractApiErrorMessage(err, "L'épinglage a échoué."))
        }
    }

    const handleMarkUnread = async () => {
        if (!selected) return
        try {
            await markUnread(selected.id)
            setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, unread: Math.max(c.unread, 1) } : c))
            toast.success("Conversation marquée comme non lue.")
        } catch (err) {
            console.error("[messages] unread error:", err)
            toast.error(extractApiErrorMessage(err, "Le marquage a échoué."))
        }
    }

    const openScheduleMeet = () => {
        if (!selected) return
        setMeetTitle(`Échange avec ${selected.name}`)
        setMeetDate("")
        setMeetOpen(true)
    }

    /**
     * Crée la session Goriya Meet (en invitant l'autre participant, qui la
     * retrouvera dans son propre espace Appels) puis annonce le rendez-vous
     * dans la conversation - un message reste le moyen le plus sûr d'avertir
     * quelqu'un qui n'a pas de notification push active.
     */
    const handleScheduleMeet = async () => {
        if (!selected || !meetTitle.trim()) return
        setScheduling(true)
        try {
            const scheduledAtIso = meetDate ? new Date(meetDate).toISOString() : undefined
            await scheduleCallSession(meetTitle.trim(), scheduledAtIso, selected.otherUserId ? [selected.otherUserId] : [])
            const quand = scheduledAtIso
                ? new Date(scheduledAtIso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })
                : "dès maintenant"
            const contenu = `📅 Appel Goriya Meet planifié : « ${meetTitle.trim()} » - ${quand}. Rejoignez-le depuis votre espace Appels.`
            await sendMessage(selected.id, contenu)
            await loadMessages(selected.id)
            setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, lastMessage: contenu } : c))
            setMeetOpen(false)
            toast.success("Goriya Meet planifié et annoncé dans la conversation.")
        } catch (err) {
            console.error("[messages] schedule meet error:", err)
            toast.error(extractApiErrorMessage(err, "La planification a échoué."))
        } finally {
            setScheduling(false)
        }
    }

    const handleDelete = async () => {
        if (!confirmDelete) return
        setDeleting(true)
        try {
            await deleteConversation(confirmDelete.id)
            const restantes = conversations.filter((c) => c.id !== confirmDelete.id)
            setConversations(restantes)
            if (selected?.id === confirmDelete.id) {
                const suivante = restantes[0] ?? null
                setSelected(suivante)
                setMessages([])
                if (suivante) loadMessages(suivante.id)
            }
            setConfirmDelete(null)
            toast.success("Conversation supprimée de votre liste.")
        } catch (err) {
            console.error("[messages] delete error:", err)
            toast.error(extractApiErrorMessage(err, "La suppression a échoué."))
        } finally {
            setDeleting(false)
        }
    }

    const handleRefresh = async () => {
        if (!selected) return
        await loadMessages(selected.id)
        toast.success("Conversation actualisée.")
    }

    const filtered = conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    // Les conversations épinglées remontent en tête, l'ordre du backend
    // (message le plus récent d'abord) est conservé à l'intérieur de chaque groupe.
    const ordonnees = [...filtered].sort((a, b) => Number(b.starred) - Number(a.starred))

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
        )
    }

    return (
        <>
            {/* Même disposition que l'espace candidat : deux panneaux plein
                écran (liste / conversation), un seul visible à la fois sur
                mobile — pas une page de tableau de bord avec un encadré. */}
            <div className="flex h-[calc(100vh-6rem)] overflow-hidden md:h-[calc(100vh-7rem)]">
                {/* Conversations */}
                <div className={`${showMobileList ? "flex" : "hidden"} w-full flex-shrink-0 flex-col border-r border-border bg-background md:flex md:w-80`}>
                    <div className="border-b border-border p-4">
                        <h1 className="mb-4 text-xl font-semibold text-foreground">Messages</h1>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-10" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {ordonnees.length === 0 ? (
                            <p className="p-4 text-sm text-muted-foreground">Aucune conversation.</p>
                        ) : (
                            ordonnees.map((conv) => (
                                <div
                                    key={conv.id}
                                    onClick={() => handleSelectConv(conv)}
                                    className={`cursor-pointer border-b border-border p-4 transition-colors hover:bg-muted/50 ${selected?.id === conv.id ? "bg-primary/10 border-primary/20" : ""}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <Avatar className="h-12 w-12">
                                            {conv.avatar && <AvatarImage src={conv.avatar} alt={conv.name} className="object-cover" />}
                                            <AvatarFallback>{initials(conv.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex items-center justify-between">
                                                <h3 className="truncate font-medium text-foreground">{conv.name}</h3>
                                                <div className="flex items-center gap-1">
                                                    {conv.unread > 0 && (
                                                        <Badge className="bg-brand-gradient px-2 py-1 text-xs text-white">{conv.unread}</Badge>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        aria-label={conv.starred ? "Retirer des conversations épinglées" : "Épingler la conversation"}
                                                        title={conv.starred ? "Retirer des conversations épinglées" : "Épingler la conversation"}
                                                        onClick={async (e) => {
                                                            e.stopPropagation()
                                                            const suivant = !conv.starred
                                                            setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, starred: suivant } : c))
                                                            try {
                                                                await starConversation(conv.id, suivant)
                                                            } catch (err) {
                                                                console.error("[messages] star error:", err)
                                                                setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, starred: !suivant } : c))
                                                                toast.error("L'épinglage a échoué.")
                                                            }
                                                        }}
                                                    >
                                                        <Star className={cn("h-4 w-4", conv.starred && "fill-amber-400 text-amber-400")} />
                                                    </Button>
                                                </div>
                                            </div>
                                            {conv.title && <p className="mb-1 truncate text-sm text-muted-foreground">{conv.title}</p>}
                                            <p className="truncate text-sm text-muted-foreground">{conv.lastMessage}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">{conv.time}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Conversation */}
                <div className={`${!showMobileList ? "flex" : "hidden"} min-w-0 flex-1 flex-col bg-background md:flex`}>
                    {selected ? (
                        <>
                            <div className="border-b border-border bg-background p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Button variant="ghost" size="sm" className="-ml-2 mr-1 md:hidden" onClick={() => setShowMobileList(true)}>
                                            <ChevronLeft className="h-5 w-5" />
                                        </Button>
                                        <Avatar className="h-10 w-10">
                                            {selected.avatar && <AvatarImage src={selected.avatar} alt={selected.name} className="object-cover" />}
                                            <AvatarFallback>{initials(selected.name)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h2 className="font-semibold text-foreground">{selected.name}</h2>
                                            {selected.title && <p className="text-sm text-muted-foreground">{selected.title}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleToggleStar}
                                            aria-label={selected.starred ? "Retirer des conversations épinglées" : "Épingler la conversation"}
                                            title={selected.starred ? "Retirer des conversations épinglées" : "Épingler la conversation"}
                                        >
                                            <Star className={cn("h-4 w-4", selected.starred && "fill-amber-400 text-amber-400")} />
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" aria-label="Plus d'actions" title="Plus d'actions">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                {/* focus:bg-accent (par défaut) rendait un orangé peu lisible au
                                                    survol : le dégradé de marque le remplace, comme ailleurs. */}
                                                <DropdownMenuItem onClick={handleMarkUnread} className="gap-2 focus:bg-brand-gradient focus:text-white focus:[&_svg:not([class*='text-'])]:text-white">
                                                    <MailOpen className="h-4 w-4" />
                                                    Marquer comme non lue
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={handleToggleStar} className="gap-2 focus:bg-brand-gradient focus:text-white focus:[&_svg:not([class*='text-'])]:text-white">
                                                    <Star className="h-4 w-4" />
                                                    {selected.starred ? "Retirer des épinglées" : "Épingler la conversation"}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={handleRefresh} className="gap-2 focus:bg-brand-gradient focus:text-white focus:[&_svg:not([class*='text-'])]:text-white">
                                                    <RefreshCw className="h-4 w-4" />
                                                    Actualiser les messages
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={openScheduleMeet} className="gap-2 focus:bg-brand-gradient focus:text-white focus:[&_svg:not([class*='text-'])]:text-white">
                                                    <Video className="h-4 w-4" />
                                                    Planifier Goriya Meet
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => setConfirmDelete(selected)}
                                                    className="gap-2 text-red-500 focus:bg-brand-gradient focus:text-white focus:[&_svg:not([class*='text-'])]:text-white"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Supprimer la conversation
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 overflow-y-auto p-4">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
                                        <div
                                            className={cn(
                                                // Bulle façon messagerie : coins arrondis, sauf celui qui pointe
                                                // vers l'expéditeur (queue de bulle).
                                                "max-w-xs rounded-2xl px-4 py-2 lg:max-w-md",
                                                msg.isMe
                                                    ? "bg-brand-gradient text-white rounded-br-sm"
                                                    : "bg-muted text-foreground rounded-bl-sm",
                                            )}
                                        >
                                            {msg.content && <p className="text-sm">{msg.content}</p>}
                                            {msg.attachment && (
                                                <button
                                                    type="button"
                                                    disabled={!msg.attachment.url}
                                                    onClick={() => msg.attachment?.url && setViewedFile({
                                                        name: msg.attachment.name,
                                                        url: msg.attachment.url,
                                                        mimeType: msg.attachment.mimeType,
                                                    })}
                                                    className={`mt-1.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors disabled:cursor-default disabled:opacity-70 ${msg.isMe ? "bg-white/15 hover:bg-white/25" : "bg-background hover:bg-background/70"}`}
                                                >
                                                    {msg.pending
                                                        ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                                                        : <FileText className="h-4 w-4 shrink-0" />}
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-xs font-medium">{msg.attachment.name}</span>
                                                        <span className={`block text-[10px] ${msg.isMe ? "text-white/70" : "text-muted-foreground"}`}>
                                                            {msg.pending ? "Envoi…" : formatSize(msg.attachment.size)}
                                                        </span>
                                                    </span>
                                                </button>
                                            )}
                                            <p className={`mt-1 text-xs ${msg.isMe ? "text-white/70" : "text-muted-foreground"}`}>{msg.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-border bg-background p-4">
                                {pendingFile && (
                                    <div className="mb-2 flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                                        <span className="min-w-0 flex-1 truncate text-xs text-foreground">{pendingFile.name}</span>
                                        <span className="shrink-0 text-[11px] text-muted-foreground">{formatSize(pendingFile.size)}</span>
                                        <button
                                            onClick={() => setPendingFile(null)}
                                            aria-label="Retirer la pièce jointe"
                                            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-background"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp"
                                        onChange={(e) => {
                                            handlePickFile(e.target.files?.[0])
                                            // Permet de re-sélectionner le même fichier après un retrait.
                                            e.target.value = ""
                                        }}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        title="Joindre un fichier (PDF, Word, Excel, texte ou image - 8 Mo max)"
                                        aria-label="Joindre un fichier"
                                    >
                                        <Paperclip className="h-4 w-4" />
                                    </Button>
                                    <div className="relative flex-1">
                                        <Input
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder={pendingFile ? "Ajouter un message (facultatif)…" : "Message de réponse"}
                                            onKeyDown={(e) => { if (e.key === "Enter") handleSend() }}
                                        />
                                    </div>
                                    <Button
                                        onClick={handleSend}
                                        className="bg-brand-gradient hover:bg-brand-gradient-hover"
                                        disabled={sending || (!newMessage.trim() && !pendingFile)}
                                    >
                                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 items-center justify-center">
                            <div className="text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                    <Search className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="mb-2 text-lg font-medium text-foreground">Sélectionne une conversation</h3>
                                <p className="text-muted-foreground">Choisis une conversation dans la liste pour commencer à discuter</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <FileViewerDialog
                file={viewedFile}
                subtitle={selected ? `Pièce jointe - ${selected.name}` : null}
                onClose={() => setViewedFile(null)}
            />

            <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette conversation ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Le fil avec {confirmDelete?.name} disparaît de votre liste. Le candidat conserve
                            l&apos;échange de son côté, et un nouveau message le fera réapparaître ici.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDelete() }}
                            disabled={deleting}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {deleting ? "Suppression…" : "Supprimer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={meetOpen} onOpenChange={(open) => !scheduling && setMeetOpen(open)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Planifier Goriya Meet</DialogTitle>
                        <DialogDescription>
                            {selected?.name} sera invité·e à rejoindre la session, et prévenu·e par un message dans
                            cette conversation.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div>
                            <label htmlFor="meet-title" className="mb-1.5 block text-xs text-muted-foreground">Titre</label>
                            <Input id="meet-title" value={meetTitle} onChange={(e) => setMeetTitle(e.target.value)} placeholder="Échange avec…" />
                        </div>
                        <div>
                            <label htmlFor="meet-date" className="mb-1.5 block text-xs text-muted-foreground">
                                Date et heure <span className="text-muted-foreground/70">(vide = démarrer maintenant)</span>
                            </label>
                            <Input
                                id="meet-date"
                                type="datetime-local"
                                value={meetDate}
                                onChange={(e) => setMeetDate(e.target.value)}
                                min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" disabled={scheduling} onClick={() => setMeetOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            size="sm"
                            className="gap-1.5 bg-brand-gradient hover:bg-brand-gradient-hover"
                            disabled={scheduling || !meetTitle.trim()}
                            onClick={handleScheduleMeet}
                        >
                            {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                            Planifier
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default function MessagesPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center p-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
        }>
            <MessagesContent />
        </Suspense>
    )
}
