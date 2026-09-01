import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Backend réel. Les requêtes du navigateur ne le contactent jamais directement :
// elles passent par cette route, qui lit la session NextAuth (cookie httpOnly)
// côté serveur et attache le Bearer token avant de relayer la requête.
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://goriya-backend-production.up.railway.app"

// Content-Type autorisés à être reflétés tels quels pour les réponses binaires (avatars,
// logos affichés inline via <img>). Tout le reste (notamment text/html et image/svg+xml,
// qui peuvent contenir du script exécutable) est neutralisé en application/octet-stream et
// forcé en téléchargement, pour empêcher le navigateur de le rendre inline sur cette origine
// authentifiée (XSS via fichier uploadé avec un Content-Type forgé).
const INLINE_SAFE_CONTENT_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
])

// Exports (CSV/PDF) : type connu et sûr, mais toujours proposés en téléchargement.
const DOWNLOAD_CONTENT_TYPES = new Set([
    "application/pdf",
    "text/csv",
])

type RouteContext = { params: Promise<{ path: string[] }> }

async function handleProxy(request: NextRequest, { params }: RouteContext) {
    const { path } = await params
    const targetUrl = new URL(`${API_BASE_URL}/${path.join("/")}`)

    request.nextUrl.searchParams.forEach((value, key) => {
        targetUrl.searchParams.append(key, value)
    })

    const session = await getServerSession(authOptions)
    const accessToken = session?.user?.access_token

    const headers: Record<string, string> = {}
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
    }

    let body: BodyInit | undefined
    const contentType = request.headers.get("content-type") || ""

    if (!["GET", "HEAD"].includes(request.method)) {
        if (contentType.includes("multipart/form-data")) {
            // On relaie le FormData tel quel (fichiers compris) ; fetch reconstruit
            // automatiquement l'en-tête Content-Type multipart avec la bonne boundary.
            body = await request.formData()
        } else if (contentType.includes("application/json")) {
            headers["Content-Type"] = "application/json"
            body = await request.text()
        } else {
            body = await request.blob()
            if (contentType) headers["Content-Type"] = contentType
        }
    }

    try {
        const upstreamResponse = await fetch(targetUrl.toString(), {
            method: request.method,
            headers,
            body,
        })

        const upstreamContentType = upstreamResponse.headers.get("content-type") || ""

        if (upstreamContentType.includes("application/json")) {
            const payload = await upstreamResponse.json().catch(() => null)
            return NextResponse.json(payload, { status: upstreamResponse.status })
        }

        // Réponse d'erreur non-JSON (413 nginx, 500 HTML, gateway…) : on ne la traite
        // pas comme un fichier à télécharger — on renvoie un message exploitable au client.
        if (!upstreamResponse.ok) {
            const text = await upstreamResponse.text().catch(() => "")
            const message =
                upstreamResponse.status === 413
                    ? "Fichier(s) trop volumineux. Réduis la taille des images (max ~8 Mo chacune)."
                    : (text.trim().slice(0, 300) || `Erreur ${upstreamResponse.status} du serveur.`)
            return NextResponse.json({ message }, { status: upstreamResponse.status })
        }

        // Réponses binaires / blob (fichiers, images, etc.)
        const blob = await upstreamResponse.blob()
        const baseType = upstreamContentType.split(";")[0].trim().toLowerCase()

        const isInlineSafe = INLINE_SAFE_CONTENT_TYPES.has(baseType)
        const isDownload = DOWNLOAD_CONTENT_TYPES.has(baseType)
        const safeType = isInlineSafe || isDownload ? baseType : "application/octet-stream"

        const responseHeaders: Record<string, string> = {
            "Content-Type": safeType,
            "X-Content-Type-Options": "nosniff",
        }

        // Seuls les types image whitelist peuvent s'afficher inline (ex: <img src=...>).
        // Tout le reste (exports connus, ou type inconnu/coercé en octet-stream) est forcé
        // en téléchargement pour qu'il ne soit jamais exécuté/rendu par le navigateur.
        if (!isInlineSafe) {
            responseHeaders["Content-Disposition"] = "attachment"
            responseHeaders["Content-Security-Policy"] = "sandbox; default-src 'none'"
        }

        return new NextResponse(blob, {
            status: upstreamResponse.status,
            headers: responseHeaders,
        })
    } catch (error) {
        console.error(`[proxy] error forwarding ${request.method} ${targetUrl.toString()}:`, error)
        return NextResponse.json({ message: "Erreur de communication avec le serveur" }, { status: 502 })
    }
}

export {
    handleProxy as GET,
    handleProxy as POST,
    handleProxy as PUT,
    handleProxy as PATCH,
    handleProxy as DELETE,
}
