export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

let scriptPromise: Promise<void> | null = null

/** Charge le script Google Identity Services une seule fois. */
export const initializeGoogleAuth = (): Promise<void> => {
    if (typeof window === "undefined") {
        return Promise.reject(new Error("Google Auth ne peut être initialisé que dans le navigateur"))
    }
    if (!GOOGLE_CLIENT_ID) {
        return Promise.resolve()
    }
    if (window.google?.accounts?.id) {
        return Promise.resolve()
    }
    if (scriptPromise) return scriptPromise

    scriptPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement("script")
        script.src = "https://accounts.google.com/gsi/client"
        script.async = true
        script.defer = true
        script.onload = () => resolve()
        script.onerror = () => {
            scriptPromise = null
            reject(new Error("Échec du chargement de Google Identity Services"))
        }
        document.head.appendChild(script)
    })
    return scriptPromise
}

/**
 * Ouvre la fenêtre Google et résout avec le `credential` brut (ID token JWT).
 * Ce jeton est vérifié côté serveur (POST /auth/google) — jamais décodé ici
 * pour en extraire l'identité.
 */
export const signInWithGoogle = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !window.google?.accounts?.id) {
            reject(new Error("Google Identity Services non chargé"))
            return
        }
        if (!GOOGLE_CLIENT_ID) {
            reject(new Error("Connexion Google non configurée"))
            return
        }

        try {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: (response: { credential?: string }) => {
                    if (response?.credential) resolve(response.credential)
                    else reject(new Error("Aucun identifiant Google reçu"))
                },
                auto_select: false,
                cancel_on_tap_outside: true,
            })

            const container = document.createElement("div")
            container.style.display = "none"
            document.body.appendChild(container)
            window.google.accounts.id.renderButton(container, { theme: "outline", size: "large", type: "standard" })

            const button = container.querySelector("div[role='button']") as HTMLElement | null
            if (button) {
                button.click()
            } else {
                window.google.accounts.id.prompt((n: any) => {
                    if (n.isNotDisplayed?.() || n.isSkippedMoment?.()) {
                        reject(new Error("Connexion Google annulée ou indisponible"))
                    }
                })
            }

            setTimeout(() => container.remove(), 2000)
        } catch (err) {
            console.error("[google-auth] échec init:", err)
            reject(new Error("Échec de l'initialisation de la connexion Google"))
        }
    })
}

declare global {
    interface Window {
        google?: any
    }
}
