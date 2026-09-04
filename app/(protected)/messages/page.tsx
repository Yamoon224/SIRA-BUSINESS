"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import { ScrollArea } from "@/components/ui/scroll-area"
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
    User,
    Loader2,
    X,
    FileText,
    MailOpen,
    RefreshCw,
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
} from "@/actions/messages"
import { extractApiErrorMessage } from "@/lib/api-error"
import { FileViewerDialog, type ViewableFile } from "@/components/file-viewer-dialog"

type Conversation = { id: string; name: string; role: string; time: string; unread: number; lastMessage: string; starred: boolean }
type Attachment = { name: string; url: string; mimeType: string | null; size: number | null }
type Message = { id: string; content: string; time: string; isMe: boolean; attachment: Attachment | null; pending?: boolean }

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024

function mapConversation(raw: any): Conversation {
    return {
        id: String(raw.id ?? raw._id ?? ""),
        name: raw.name ?? raw.participantName ?? raw.candidate?.name ?? "-",
        role: raw.role ?? raw.candidate?.title ?? "Candidat",
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

function AvatarIcon({ small = false }: { small?: boolean }) {
    const dim = small ? "h-9 w-9" : "h-11 w-11"
    return <div className={`${dim} shrink-0 rounded-full bg-blue-500 flex items-center justify-center`}><User className="h-5 w-5 text-white" strokeWidth={1.8} /></div>
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
    const userId = session?.user?.id ?? ""

    // Pièce jointe : choisie puis envoyée avec (ou sans) le texte en cours.
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [pendingFile, setPendingFile] = useState<File | null>(null)
    const [sending, setSending] = useState(false)

    const [confirmDelete, setConfirmDelete] = useState<Conversation | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [viewedFile, setViewedFile] = useState<ViewableFile | null>(null)

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
        <div className="space-y-6">
            <PageHeader
                title="Messages"
                description="Échangez directement avec les candidats qui ont postulé à vos offres."
            />

            <div className="flex flex-col lg:flex-row overflow-hidden rounded-xl border border-border bg-white" style={{ minHeight: "70vh" }}>
                <div className="flex w-full lg:w-[320px] shrink-0 flex-col border-b lg:border-b-0 lg:border-r border-border">
                    <div className="px-3 py-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une conversation..." className="pl-9 h-9 text-sm bg-gray-50 border-gray-200" />
                        </div>
                    </div>
                    <ScrollArea className="h-64 lg:h-[58vh]">
                        {ordonnees.length === 0 ? (
                            <p className="px-3 py-4 text-xs text-muted-foreground">Aucune conversation.</p>
                        ) : (
                            ordonnees.map((conv) => (
                                <button key={conv.id} onClick={() => handleSelectConv(conv)} className={`w-full px-3 py-3 text-left transition-colors hover:bg-blue-50/60 ${selected?.id === conv.id ? "bg-blue-50" : ""}`}>
                                    <div className="flex items-start gap-3">
                                        <AvatarIcon small />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="flex min-w-0 items-center gap-1.5">
                                                    {conv.starred && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                                                    <span className="truncate text-[13px] font-semibold text-foreground">{conv.name}</span>
                                                </span>
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    {conv.unread > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">{conv.unread}</span>}
                                                    <span className="whitespace-nowrap text-[11px] text-muted-foreground">{conv.time}</span>
                                                </div>
                                            </div>
                                            <p className="truncate text-[11px] text-muted-foreground">{conv.role}</p>
                                            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{conv.lastMessage}</p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </ScrollArea>
                </div>

                <div className="flex flex-1 flex-col min-h-[45vh]">
                    {selected ? (
                        <>
                            <div className="flex items-center justify-between border-b border-border bg-blue-50/40 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <AvatarIcon />
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{selected.name}</p>
                                        <p className="text-xs text-muted-foreground">{selected.role}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <button
                                        onClick={handleToggleStar}
                                        title={selected.starred ? "Retirer des conversations épinglées" : "Épingler la conversation"}
                                        aria-label={selected.starred ? "Retirer des conversations épinglées" : "Épingler la conversation"}
                                        className="rounded p-1.5 hover:bg-gray-100 transition-colors"
                                    >
                                        <Star className={`h-4 w-4 ${selected.starred ? "fill-amber-400 text-amber-400" : ""}`} />
                                    </button>
                                    <button
                                        onClick={() => setConfirmDelete(selected)}
                                        title="Supprimer la conversation"
                                        aria-label="Supprimer la conversation"
                                        className="rounded p-1.5 hover:bg-red-50 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                title="Plus d'actions"
                                                aria-label="Plus d'actions"
                                                className="rounded p-1.5 hover:bg-gray-100 transition-colors"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuItem onClick={handleMarkUnread} className="gap-2">
                                                <MailOpen className="h-4 w-4" />
                                                Marquer comme non lue
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={handleToggleStar} className="gap-2">
                                                <Star className="h-4 w-4" />
                                                {selected.starred ? "Retirer des épinglées" : "Épingler la conversation"}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={handleRefresh} className="gap-2">
                                                <RefreshCw className="h-4 w-4" />
                                                Actualiser les messages
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => setConfirmDelete(selected)}
                                                className="gap-2 text-red-500 focus:text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Supprimer la conversation
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            <ScrollArea className="flex-1 bg-gray-50/30 px-4 sm:px-6 py-4">
                                <div className="space-y-4">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[92%] sm:max-w-[75%] lg:max-w-[65%] rounded-2xl px-4 py-2.5 ${msg.isMe ? "bg-blue-500 text-white" : "bg-white shadow-sm border border-gray-100 text-foreground"}`}>
                                                {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
                                                {msg.attachment && (
                                                    <button
                                                        type="button"
                                                        disabled={!msg.attachment.url}
                                                        onClick={() => msg.attachment?.url && setViewedFile({
                                                            name: msg.attachment.name,
                                                            url: msg.attachment.url,
                                                            mimeType: msg.attachment.mimeType,
                                                        })}
                                                        className={`mt-1.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors disabled:cursor-default disabled:opacity-70 ${msg.isMe ? "bg-blue-400/40 hover:bg-blue-400/60" : "bg-muted hover:bg-muted/70"}`}
                                                    >
                                                        {msg.pending
                                                            ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                                                            : <FileText className="h-4 w-4 shrink-0" />}
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-xs font-medium">{msg.attachment.name}</span>
                                                            <span className={`block text-[10px] ${msg.isMe ? "text-blue-100" : "text-muted-foreground"}`}>
                                                                {msg.pending ? "Envoi…" : formatSize(msg.attachment.size)}
                                                            </span>
                                                        </span>
                                                    </button>
                                                )}
                                                <p className={`mt-1 text-[11px] ${msg.isMe ? "text-blue-100" : "text-muted-foreground"}`}>{msg.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>

                            {pendingFile && (
                                <div className="flex items-center gap-2 border-t border-border bg-blue-50/60 px-3 sm:px-4 py-2">
                                    <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">{pendingFile.name}</span>
                                    <span className="shrink-0 text-[11px] text-muted-foreground">{formatSize(pendingFile.size)}</span>
                                    <button
                                        onClick={() => setPendingFile(null)}
                                        aria-label="Retirer la pièce jointe"
                                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-white"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-2 border-t border-border bg-white px-3 sm:px-4 py-3">
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
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Joindre un fichier (PDF, Word, Excel, texte ou image — 8 Mo max)"
                                    aria-label="Joindre un fichier"
                                    className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-gray-100 transition-colors"
                                >
                                    <Paperclip className="h-4 w-4" />
                                </button>
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={pendingFile ? "Ajouter un message (facultatif)…" : "Tapez votre message..."}
                                    className="flex-1 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
                                    onKeyDown={(e) => { if (e.key === "Enter") handleSend() }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={sending || (!newMessage.trim() && !pendingFile)}
                                    aria-label="Envoyer le message"
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                            Sélectionne une conversation
                        </div>
                    )}
                </div>
            </div>

            <FileViewerDialog
                file={viewedFile}
                subtitle={selected ? `Pièce jointe — ${selected.name}` : null}
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
        </div>
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
