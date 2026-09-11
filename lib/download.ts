/**
 * Fichiers servis par l'API (via le proxy authentifié).
 *
 * Le proxy force `Content-Disposition: attachment` sans nom de fichier : un
 * simple lien ferait nommer le fichier d'après l'URL (« document », « draft »).
 * Passer par un blob permet aussi de lire le message d'erreur de l'API au lieu
 * de télécharger une page d'erreur.
 */
async function fetchBlob(endpoint: string): Promise<Blob> {
    const response = await fetch(`/api/proxy${endpoint}`)

    if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw { message: payload?.message ?? `Téléchargement impossible (erreur ${response.status}).` }
    }

    return response.blob()
}

/** Télécharge un fichier de l'API sous le nom voulu. */
export async function downloadFromApi(endpoint: string, filename: string): Promise<void> {
    const url = URL.createObjectURL(await fetchBlob(endpoint))
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * URL locale d'un fichier de l'API, pour l'afficher (PDF, image) sans le
 * télécharger. À libérer avec `URL.revokeObjectURL` une fois l'aperçu fermé.
 */
export async function fetchBlobUrl(endpoint: string): Promise<string> {
    return URL.createObjectURL(await fetchBlob(endpoint))
}
