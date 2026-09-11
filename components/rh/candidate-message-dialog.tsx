"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { createConversation, sendMessage } from "@/actions/messages"
import { extractApiErrorMessage } from "@/lib/api-error"

interface CandidateMessageDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    candidate: { id: string; name: string; email: string } | null
}

/**
 * Message à un candidat sans quitter le pipeline : la conversation Goriya liée
 * à la candidature s'ouvre en arrière-plan, comme depuis la page Candidatures.
 */
export function CandidateMessageDialog({ open, onOpenChange, candidate }: CandidateMessageDialogProps) {
    const router = useRouter()
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [text, setText] = useState("")
    const [opening, setOpening] = useState(false)
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!open || !candidate) return
        let cancelled = false
        setText("")
        setSent(false)
        setError(null)
        setConversationId(null)
        setOpening(true)
        createConversation(candidate.id)
            .then((res) => {
                const conversation = (res as { data?: { id?: string } })?.data ?? (res as { id?: string })
                if (!conversation?.id) throw new Error("Conversation introuvable")
                if (!cancelled) setConversationId(String(conversation.id))
            })
            .catch((err) => {
                if (!cancelled) setError(extractApiErrorMessage(err, "Impossible d'ouvrir la conversation avec ce candidat."))
            })
            .finally(() => {
                if (!cancelled) setOpening(false)
            })
        return () => {
            cancelled = true
        }
    }, [open, candidate])

    const send = async () => {
        const content = text.trim()
        if (!content) return setError("Écrivez un message avant de l'envoyer.")
        if (!conversationId) return
        setSending(true)
        setError(null)
        try {
            await sendMessage(conversationId, content)
            setSent(true)
            setText("")
        } catch (err) {
            setError(extractApiErrorMessage(err, "L'envoi du message a échoué."))
        } finally {
            setSending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !sending && onOpenChange(next)}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Message à {candidate?.name}</DialogTitle>
                    <DialogDescription>{candidate?.email}</DialogDescription>
                </DialogHeader>

                {opening ? (
                    <div className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        Ouverture de la conversation…
                    </div>
                ) : sent ? (
                    <div className="space-y-4 py-2">
                        <p className="flex items-center gap-2 text-sm text-green-700">
                            <Check className="h-4 w-4" />
                            Message envoyé à {candidate?.name}.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Fermer</Button>
                            <Button size="sm" onClick={() => router.push(`/messages?conversation=${conversationId}`)}>Ouvrir la conversation</Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <Textarea
                            value={text}
                            onChange={(e) => {
                                setText(e.target.value)
                                if (error) setError(null)
                            }}
                            placeholder="Bonjour, suite à votre candidature…"
                            aria-label="Votre message"
                            aria-invalid={!!error}
                            disabled={!conversationId || sending}
                            className="min-h-[140px] text-sm"
                        />
                        {error && <p className="text-xs text-destructive">{error}</p>}
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button variant="outline" size="sm" disabled={sending} onClick={() => onOpenChange(false)}>Annuler</Button>
                            <Button size="sm" disabled={sending || !conversationId || !text.trim()} onClick={() => void send()}>
                                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Envoyer
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
