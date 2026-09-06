"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { notificationService, type INotification } from "@/lib/notification.service"

/**
 * Destination d'une notification. Le backend porte désormais un `link` — un
 * chemin relatif qui désigne l'élément exact, par exemple
 * `/messages?conversation=<uuid>`. Les notifications antérieures à cette
 * colonne n'en ont pas : on retombe alors sur le type puis sur le libellé,
 * qui mènent à la bonne page à défaut du bon élément.
 */
function hrefFor(notification: INotification): string {
    const link = notification.link?.trim()
    // Un lien absolu venu d'ailleurs n'a rien à faire dans un router.push.
    if (link && link.startsWith("/")) return link

    const indice = `${notification.type ?? ""} ${notification.title ?? ""}`.toLowerCase()

    if (indice.includes("message") || indice.includes("conversation") || indice.includes("chat")) {
        return "/messages"
    }
    if (indice.includes("application") || indice.includes("candidat")) {
        return "/candidatures"
    }
    if (indice.includes("offer") || indice.includes("offre") || indice.includes("annonce")) {
        return "/annonces"
    }
    return "/dashboard"
}

function formatDate(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function NotificationBell() {
    const router = useRouter()
    const [notifications, setNotifications] = useState<INotification[]>([])
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        notificationService.getNotifications()
            .then((data) => setNotifications(Array.isArray(data) ? data : []))
            .catch(() => {})
            .finally(() => setLoaded(true))
    }, [])

    const unreadCount = notifications.filter((n) => !n.isRead).length

    /**
     * Une notification n'est pas qu'un texte : elle annonce un évènement qui a
     * une page. On la marque lue puis on y emmène l'utilisateur, au lieu de le
     * laisser chercher lui-même où l'évènement s'est produit.
     */
    const handleSelect = (notification: INotification) => {
        if (!notification.isRead) {
            setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)))
            notificationService.markAsRead(notification.id).catch(() => {})
        }
        router.push(hrefFor(notification))
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {loaded && unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 p-1.5" align="end">
                <DropdownMenuLabel className="px-2 pb-2">Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                    <p className="px-2 py-4 text-center text-sm text-muted-foreground">Aucune notification pour l'instant.</p>
                ) : (
                    /* `group` + `focus:` : l'élément survolé/sélectionné passe au
                       dégradé de marque et TOUT son texte en blanc — les libellés
                       secondaires portent leur propre couleur, ils ne suivraient
                       pas la couleur héritée du parent. */
                    notifications.slice(0, 5).map((n) => (
                        <DropdownMenuItem
                            key={n.id}
                            className="group my-0.5 flex cursor-pointer flex-col items-start gap-1 whitespace-normal rounded-md px-2 py-2.5 focus:bg-brand-gradient focus:text-white"
                            onSelect={() => handleSelect(n)}
                        >
                            <span className="flex w-full items-start gap-2">
                                {!n.isRead && (
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 group-focus:bg-white" />
                                )}
                                <span
                                    className={cn(
                                        "min-w-0 flex-1 text-sm group-focus:text-white",
                                        n.isRead ? "text-muted-foreground" : "font-medium text-foreground",
                                        n.isRead && "pl-3.5",
                                    )}
                                >
                                    {n.title}
                                </span>
                            </span>
                            {n.body && (
                                <span className="line-clamp-2 pl-3.5 text-xs text-muted-foreground group-focus:text-white/85">
                                    {n.body}
                                </span>
                            )}
                            <span className="pl-3.5 text-[10px] text-muted-foreground group-focus:text-white/70">
                                {formatDate(n.createdAt)}
                            </span>
                        </DropdownMenuItem>
                    ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-md focus:bg-brand-gradient focus:text-white">
                    <Link href="/parametres" className="justify-center text-sm font-medium text-primary">
                        Gérer les notifications
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
