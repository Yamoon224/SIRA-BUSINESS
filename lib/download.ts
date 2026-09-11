/**
 * Télécharge un fichier servi par l'API (via le proxy authentifié) sous le nom
 * voulu.
 *
 * Le proxy force `Content-Disposition: attachment` sans nom de fichier : un
 * simple lien ferait nommer le fichier d'après l'URL (« document », « draft »).
 * Passer par un blob permet aussi de lire le message d'erreur de l'API au lieu
 * de télécharger une page d'erreur.
 */
export async function downloadFromApi(endpoint: string, filename: string): Promise<void> {
    const response = await fetch(`/api/proxy${endpoint}`)

    if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw { message: payload?.message ?? `Téléchargement impossible (erreur ${response.status}).` }
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
