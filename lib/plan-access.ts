/**
 * Paliers d'abonnement entreprise et fonctionnalités qu'ils ouvrent.
 *
 * Le backend renvoie le palier dans GET /subscriptions/check/{userId}
 * (`tier`), dérivé du prix du plan actif :
 *   - "NONE" : aucun abonnement actif ;
 *   - "FREE" : « Offre gratuite » — activable sans paiement, sert à tester
 *              l'espace recrutement ;
 *   - "PAID" : forfait payant (Business, Business+).
 *
 * ⚠️ Ce module ne sert qu'à l'UX (afficher/masquer, expliquer pourquoi c'est
 * fermé). L'autorisation réelle reste celle de l'API appelée : c'est elle qui
 * doit refuser la ressource. On ne contourne rien ici — on reflète le palier
 * que le backend a calculé.
 */

export type PlanTier = "NONE" | "FREE" | "PAID"

/** Palier minimum requis par une zone de l'application. */
export type RequiredTier = "ANY" | "PAID"

/**
 * Rang des paliers : un palier donne accès à tout ce qu'exige un rang
 * inférieur ou égal.
 */
const TIER_RANK: Record<PlanTier, number> = {
    NONE: 0,
    FREE: 1,
    PAID: 2,
}

const REQUIRED_RANK: Record<RequiredTier, number> = {
    ANY: 1, // un abonnement actif, gratuit compris
    PAID: 2, // forfait payant uniquement
}

export function tierAllows(tier: PlanTier, required: RequiredTier): boolean {
    return TIER_RANK[tier] >= REQUIRED_RANK[required]
}

/** Ce que l'offre gratuite ouvre, affiché sur la page des forfaits et dans le gate. */
export const FREE_PLAN_INCLUDES = [
    "Tableau de bord",
    "Publication d'offres d'emploi",
    "Gestion de vos annonces",
    "Suivi des candidatures",
    "Messagerie avec les candidats",
    "Profil entreprise",
] as const

/** Ce qui reste réservé aux forfaits payants. */
export const PAID_PLAN_ONLY = [
    "Services RH (employés, contrats, paie, congés, documents, évaluations)",
    "Appels vidéo et entretiens intégrés",
    "Intégrations API",
] as const
