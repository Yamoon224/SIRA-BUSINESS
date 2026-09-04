import { apiRequest } from "@/lib/api-client-http"

// Ces fonctions sont utilisées côté client (Client Components) : le Bearer token
// n'est plus lu manuellement, il est attaché par la route /api/proxy à partir de
// la session NextAuth (cookie httpOnly) côté serveur.
export const getConversations = () =>
    apiRequest<any>({ endpoint: "/messages/conversations", method: "GET" })

export const getMessages = (convId: string) =>
    apiRequest<any>({ endpoint: `/messages/conversations/${convId}/messages`, method: "GET" })

export const sendMessage = (convId: string, content: string) =>
    apiRequest<any>({ endpoint: `/messages/conversations/${convId}/messages`, method: "POST", data: { content } })

/**
 * Envoi d'une pièce jointe (avec ou sans texte). Même endpoint que
 * `sendMessage`, mais en multipart : axios pose lui-même le Content-Type et sa
 * boundary à partir du FormData, et /api/proxy le relaie tel quel.
 */
export const sendAttachment = (convId: string, file: File, content = "") => {
    const body = new FormData()
    body.append("attachment", file)
    if (content) body.append("content", content)

    return apiRequest<any>({ endpoint: `/messages/conversations/${convId}/messages`, method: "POST", data: body })
}

export const markRead = (convId: string) =>
    apiRequest<any>({ endpoint: `/messages/conversations/${convId}/read`, method: "PUT" })

export const markUnread = (convId: string) =>
    apiRequest<any>({ endpoint: `/messages/conversations/${convId}/unread`, method: "PUT" })

/** `starred` omis = bascule côté backend. */
export const starConversation = (convId: string, starred: boolean) =>
    apiRequest<any>({ endpoint: `/messages/conversations/${convId}/star`, method: "PUT", data: { starred } })

/** Ne supprime que pour l'appelant : le candidat garde le fil de son côté. */
export const deleteConversation = (convId: string) =>
    apiRequest<any>({ endpoint: `/messages/conversations/${convId}`, method: "DELETE" })

export const createConversation = (candidatureId: string) =>
    apiRequest<any>({ endpoint: "/messages/conversations", method: "POST", data: { candidatureId } })
