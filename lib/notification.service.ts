import { apiRequest } from "@/lib/api-client-http"

export interface INotification {
    id: string
    /**
     * Enum NotificationType du backend (MESSAGE / APPLICATION_STATUS /
     * SYSTEM). Optionnel : d'anciennes notifications peuvent remonter sans,
     * et la cloche sait retomber sur le libellé pour choisir la destination.
     */
    type?: string
    title: string
    body?: string | null
    /**
     * Chemin relatif de la page concernée, ex. `/messages?conversation=<uuid>`.
     * Optionnel : les notifications antérieures à la colonne n'en ont pas.
     */
    link?: string | null
    isRead: boolean
    createdAt: string
}

export const notificationService = {
    getNotifications: async () => {
        return apiRequest<INotification[]>({
            endpoint: "/notifications",
            method: "GET",
        })
    },

    markAsRead: async (notificationId: string) => {
        return apiRequest<{ id: string; isRead: boolean }>({
            endpoint: `/notifications/${notificationId}/read`,
            method: "PUT",
        })
    },

    markAllAsRead: async () => {
        return apiRequest<{ message: string }>({
            endpoint: "/notifications/read-all",
            method: "PUT",
        })
    },

    deleteNotification: async (notificationId: string) => {
        return apiRequest<{ message: string }>({
            endpoint: `/notifications/${notificationId}`,
            method: "DELETE",
        })
    },
}
