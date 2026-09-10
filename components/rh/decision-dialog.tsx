"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface DecisionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: ReactNode
    description?: ReactNode
    confirmLabel: string
    tone?: "approve" | "reject" | "neutral"
    /** Un refus sans explication laisse l'employé sans réponse : le commentaire peut être exigé. */
    commentRequired?: boolean
    commentPlaceholder?: string
    loading?: boolean
    onConfirm: (comment: string | null) => void | Promise<void>
}

/** Décision sur un congé ou une demande RH, avec commentaire joint. */
export function DecisionDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    tone = "neutral",
    commentRequired = false,
    commentPlaceholder = "Commentaire (facultatif)",
    loading = false,
    onConfirm,
}: DecisionDialogProps) {
    const [comment, setComment] = useState("")
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            setComment("")
            setError(null)
        }
    }, [open])

    const confirm = () => {
        const value = comment.trim()
        if (commentRequired && !value) {
            setError("Expliquez la décision : ce commentaire est conservé avec la demande.")
            return
        }
        void onConfirm(value || null)
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description ? <DialogDescription>{description}</DialogDescription> : null}
                </DialogHeader>

                <div>
                    <Textarea
                        rows={3}
                        value={comment}
                        onChange={(e) => {
                            setComment(e.target.value)
                            if (error) setError(null)
                        }}
                        placeholder={commentRequired ? "Motif (obligatoire)" : commentPlaceholder}
                        aria-invalid={!!error}
                        aria-label="Commentaire"
                        disabled={loading}
                    />
                    {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
                        Annuler
                    </Button>
                    <Button
                        disabled={loading}
                        onClick={confirm}
                        className={cn(
                            tone === "approve" && "bg-green-600 text-white hover:bg-green-700",
                            tone === "reject" && "bg-red-500 text-white hover:bg-red-600",
                        )}
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
