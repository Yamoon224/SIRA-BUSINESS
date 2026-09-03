/**
 * Extrait un message affichable d'une erreur d'API.
 *
 * `apiRequest` rejette avec `error.response.data` quand le backend a répondu,
 * sinon avec l'erreur axios brute. Le backend Laravel renvoie
 * `{ statusCode, message, error }` (voir bootstrap/app.php), et la route
 * interne /api/proxy renvoie `{ message }` pour les erreurs non-JSON amont.
 * Mais un rejet peut aussi être une erreur réseau (`Network Error`) ou un
 * objet sans `message` — d'où ce point d'entrée unique, pour ne plus afficher
 * « Une erreur est survenue » là où le serveur a dit quelque chose d'utile,
 * ni un message technique anglais là où il n'a rien dit.
 */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
    if (!error) return fallback

    if (typeof error === "string") return error.trim() || fallback

    const err = error as {
        message?: unknown
        response?: { data?: { message?: unknown; error?: unknown } }
        code?: string
    }

    const candidates = [err.response?.data?.message, err.message, err.response?.data?.error]

    for (const candidate of candidates) {
        if (typeof candidate !== "string") continue
        const text = candidate.trim()
        if (!text) continue
        // Messages techniques d'axios : inutiles pour l'utilisateur final.
        if (/^network error$/i.test(text)) {
            return "Connexion au serveur impossible. Vérifiez votre connexion internet."
        }
        if (/^request failed with status code/i.test(text) || /^timeout of /i.test(text)) {
            continue
        }
        return text
    }

    if (err.code === "ECONNABORTED") {
        return "Le serveur met trop de temps à répondre. Réessayez dans un instant."
    }

    return fallback
}
