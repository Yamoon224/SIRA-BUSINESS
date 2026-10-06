/**
 * Référentiels décrivant l'entreprise elle-même, partagés par l'inscription et
 * le profil entreprise : les deux formulaires écrivent la même colonne
 * (`companies.company_size`), ils doivent proposer exactement les mêmes valeurs.
 */

/**
 * Tranches d'effectif. Stockées telles quelles côté backend (colonne texte
 * libre) : les libellés font office de valeurs, ce qui garde lisibles les
 * fiches déjà enregistrées avec ces mêmes tranches.
 */
export const COMPANY_SIZES = [
    "1-10 employés",
    "11-50 employés",
    "51-200 employés",
    "201-500 employés",
    "500+ employés",
] as const

export type CompanySize = (typeof COMPANY_SIZES)[number]

/** Secteurs d'activité proposés à l'inscription. */
export const SECTORS = [
    "Technologie",
    "Finance",
    "Santé",
    "Éducation",
    "Commerce",
    "Marketing",
    "Industrie",
    "Services",
] as const

/**
 * Mission et valeurs proposées sur le profil entreprise — une liste choisie
 * plutôt qu'un texte libre, pour que les valeurs restent cohérentes entre
 * entreprises (et affichables comme étiquettes sur le profil public).
 */
export const COMPANY_VALUES = [
    "Innovation",
    "Excellence",
    "Intégrité",
    "Esprit d'équipe",
    "Engagement client",
    "Transparence",
    "Performance",
    "Passion",
    "Esprit entrepreneurial",
    "Diversité et inclusion",
    "Éthique",
    "Qualité",
    "Agilité",
    "Leadership",
    "Responsabilité sociale",
    "Durabilité",
] as const
