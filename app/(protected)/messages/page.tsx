"use client"

import { Suspense, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Paperclip, Send, Star, Trash2, MoreHorizontal, User } from "lucide-react"
import { getConversations, getMessages, sendMessage, markRead } from "@/actions/messages"

type Conversation = { id: string; name: string; role: string; time: string; unread: number; lastMessage: string }
type Message = { id: string; content: string; time: string; isMe: boolean }

function mapConversation(raw: any): Conversation {
    return {
        id: String(raw.id ?? raw._id ?? ""),
        name: raw.name ?? raw.participantName ?? raw.candidate?.name ?? "-",
        role: raw.role ?? raw.candidate?.title ?? "Candidat",
        time: raw.lastMessageAt ? new Date(raw.lastMessageAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "-",
        unread: raw.unreadCount ?? 0,
        lastMessage: raw.lastMessage ?? raw.preview ?? "",
    }
}

function mapMessage(raw: any, currentUserId: string): Message {
    return {
        id: String(raw.id ?? raw._id ?? ""),
        content: raw.content ?? raw.text ?? "",
        time: raw.createdAt ? new Date(raw.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : raw.time ?? "",
        isMe: raw.senderId === currentUserId || raw.isMe === true,
    }
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
        loadMessages(conv.id)
        setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, unread: 0 } : c))
    }

    const handleSend = async () => {
        if (!newMessage.trim() || !selected) return
        const optimistic: Message = {
            id: `opt-${Date.now()}`,
            content: newMessage.trim(),
            time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
            isMe: true,
        }
        setMessages((prev) => [...prev, optimistic])
        setNewMessage("")
        try {
            await sendMessage(selected.id, optimistic.content)
        } catch (err) {
            console.error("[messages] send error:", err)
        }
    }

    const filtered = conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

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
                        {filtered.length === 0 ? (
                            <p className="px-3 py-4 text-xs text-muted-foreground">Aucune conversation.</p>
                        ) : (
                            filtered.map((conv) => (
                                <button key={conv.id} onClick={() => handleSelectConv(conv)} className={`w-full px-3 py-3 text-left transition-colors hover:bg-blue-50/60 ${selected?.id === conv.id ? "bg-blue-50" : ""}`}>
                                    <div className="flex items-start gap-3">
                                        <AvatarIcon small />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="truncate text-[13px] font-semibold text-foreground">{conv.name}</span>
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
                                    <button className="rounded p-1.5 hover:bg-gray-100 transition-colors"><Star className="h-4 w-4" /></button>
                                    <button className="rounded p-1.5 hover:bg-gray-100 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                    <button className="rounded p-1.5 hover:bg-gray-100 transition-colors"><MoreHorizontal className="h-4 w-4" /></button>
                                </div>
                            </div>

                            <ScrollArea className="flex-1 bg-gray-50/30 px-4 sm:px-6 py-4">
                                <div className="space-y-4">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[92%] sm:max-w-[75%] lg:max-w-[65%] rounded-2xl px-4 py-2.5 ${msg.isMe ? "bg-blue-500 text-white" : "bg-white shadow-sm border border-gray-100 text-foreground"}`}>
                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                                <p className={`mt-1 text-[11px] ${msg.isMe ? "text-blue-100" : "text-muted-foreground"}`}>{msg.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>

                            <div className="flex items-center gap-2 border-t border-border bg-white px-3 sm:px-4 py-3">
                                <button className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-gray-100 transition-colors"><Paperclip className="h-4 w-4" /></button>
                                <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Tapez votre message..." className="flex-1 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0" onKeyDown={(e) => { if (e.key === "Enter") handleSend() }} />
                                <button onClick={handleSend} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"><Send className="h-4 w-4" /></button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                            Sélectionne une conversation
                        </div>
                    )}
                </div>
            </div>
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
