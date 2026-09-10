"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
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
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: ReactNode
    description?: ReactNode
    confirmLabel?: string
    /** Action irréversible : bouton rouge. */
    destructive?: boolean
    loading?: boolean
    onConfirm: () => void | Promise<void>
}

/**
 * Confirmation avant une action qui ne se rattrape pas (suppression d'un
 * employé, d'un congé, d'une demande). Reprend la modale de confirmation du
 * tableau de bord : le bouton reste désactivé pendant l'appel, et la modale ne
 * se ferme qu'une fois l'action terminée (`preventDefault` sur l'action).
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Confirmer",
    destructive = false,
    loading = false,
    onConfirm,
}: ConfirmDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={loading}
                        onClick={(e) => {
                            e.preventDefault()
                            void onConfirm()
                        }}
                        className={cn(destructive && "bg-red-500 text-white hover:bg-red-600")}
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
