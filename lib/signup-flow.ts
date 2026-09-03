/**
 * État du parcours d'inscription entreprise, conservé le temps de l'onglet
 * (sessionStorage) car il traverse une redirection externe (page de paiement
 * Paiement Pro) qui fait perdre l'état React.
 *
 * Raison d'être : la page de félicitations (/auth/signup/success) ne doit
 * s'afficher qu'après une action réellement aboutie — inscription terminée,
 * abonnement activé, offre gratuite activée. Une simple consultation des
 * forfaits par une entreprise déjà inscrite ne doit PAS y mener : elle
 * retourne dans son espace.
 */

const USER_ID_KEY = "entreprise_signup_userId"
const STAGE_KEY = "entreprise_signup_stage"

/** "AWAITING_PLAN" : compte créé, choix du forfait en cours. "COMPLETED" : parcours abouti. */
type Stage = "AWAITING_PLAN" | "COMPLETED"

function read(key: string): string | null {
    if (typeof window === "undefined") return null
    try {
        return sessionStorage.getItem(key)
    } catch {
        // sessionStorage indisponible (navigation privée verrouillée, etc.) :
        // on dégrade en « hors parcours d'inscription » plutôt que de planter.
        return null
    }
}

function write(key: string, value: string): void {
    if (typeof window === "undefined") return
    try {
        sessionStorage.setItem(key, value)
    } catch {
        /* voir read() */
    }
}

function remove(key: string): void {
    if (typeof window === "undefined") return
    try {
        sessionStorage.removeItem(key)
    } catch {
        /* voir read() */
    }
}

/** Appelé juste après la vérification OTP : le compte existe, il reste le forfait. */
export function beginSignupFlow(userId: string): void {
    write(USER_ID_KEY, userId)
    write(STAGE_KEY, "AWAITING_PLAN" satisfies Stage)
}

/**
 * L'utilisateur est-il en train de finaliser une inscription ?
 *
 * Strictement l'étape « choix du forfait » : une fois le parcours abouti
 * (COMPLETED), un retour sur la page des forfaits est une consultation
 * ordinaire et ne doit plus ramener aux félicitations.
 */
export function isInSignupFlow(): boolean {
    return read(STAGE_KEY) === "AWAITING_PLAN"
}

/** userId capturé à l'inscription — nécessaire au checkout avant la 1re connexion. */
export function getSignupUserId(): string | null {
    return read(USER_ID_KEY)
}

/**
 * Marque le parcours comme abouti : c'est la seule chose qui autorise
 * l'affichage de la page de félicitations.
 */
export function completeSignupFlow(): void {
    write(STAGE_KEY, "COMPLETED" satisfies Stage)
}

/** La page de félicitations a-t-elle une raison légitime de s'afficher ? */
export function hasCompletedSignupFlow(): boolean {
    return read(STAGE_KEY) === "COMPLETED"
}

/** Fin de parcours : on repart d'un état propre (sortie de la page de félicitations). */
export function clearSignupFlow(): void {
    remove(USER_ID_KEY)
    remove(STAGE_KEY)
}
