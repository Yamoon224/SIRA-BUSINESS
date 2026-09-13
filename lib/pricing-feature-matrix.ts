/**
 * Grille de fonctionnalités des forfaits entreprise (Business / Business+ /
 * Sur Mesure) — reflète "FONCTIONNALITÉ GORIYA.pdf" (grille tarifaire sept.
 * 2026). Statique côté front : ce sont les lignes d'un tableau marketing,
 * pas des données de compte. "Sur Mesure" n'est pas un SubscriptionPlan (pas
 * de checkout, voir components/marketing/custom-plan-card.tsx) mais figure
 * ici pour que les 3 cartes énumèrent la même liste, comme dans le PDF.
 *
 * `true`  -> incluse (coche verte)
 * `false` -> absente de ce forfait (croix rouge)
 * string  -> incluse, avec une précision affichée à côté de la coche
 */
export type PlanFeatureValue = boolean | string

export interface PlanFeatureRow {
    label: string
    values: Record<"Business" | "Business+" | "Sur Mesure", PlanFeatureValue>
}

export const ENTERPRISE_PLAN_FEATURE_MATRIX: PlanFeatureRow[] = [
    { label: "Poster une offre", values: { Business: true, "Business+": true, "Sur Mesure": true } },
    {
        label: "Historique des annonces avec filtres",
        values: { Business: true, "Business+": true, "Sur Mesure": true },
    },
    { label: "Gestion des candidatures", values: { Business: true, "Business+": true, "Sur Mesure": true } },
    { label: "Goriya Meet", values: { Business: true, "Business+": true, "Sur Mesure": true } },
    {
        label: "Services RH — Gestion des employés (congés, demandes, documents)",
        values: { Business: true, "Business+": true, "Sur Mesure": true },
    },
    {
        label: "Services RH — Processus de recrutement",
        values: { Business: true, "Business+": true, "Sur Mesure": true },
    },
    { label: "Services RH — Enquêtes internes", values: { Business: false, "Business+": true, "Sur Mesure": true } },
    { label: "Services RH — Gestion de contrat", values: { Business: true, "Business+": true, "Sur Mesure": true } },
    { label: "Services RH — Gestion de paie", values: { Business: false, "Business+": true, "Sur Mesure": true } },
    { label: "Intégration API", values: { Business: false, "Business+": false, "Sur Mesure": true } },
    { label: "Édition du profil entreprise", values: { Business: true, "Business+": true, "Sur Mesure": true } },
    {
        label: "Notification prioritaire",
        values: { Business: "In-app", "Business+": "In-app + email", "Sur Mesure": "In-app + email" },
    },
    { label: "Gestion de projets", values: { Business: false, "Business+": false, "Sur Mesure": true } },
    { label: "Gestion de logistique", values: { Business: false, "Business+": false, "Sur Mesure": true } },
]

/**
 * Un forfait donné inclut-il `featureLabel` (une ligne de
 * ENTERPRISE_PLAN_FEATURE_MATRIX) ? Sert de garde-fou (SubscriptionGate) en
 * plus de l'affichage marketing. "Offre gratuite" et "Sur Mesure" ne sont
 * pas des clés de la matrice (le premier n'est pas dans la grille PDF, le
 * second n'est pas un SubscriptionPlan réel) : elles ne matchent donc aucune
 * ligne et sont toujours refusées ici, par construction.
 */
export function planIncludesFeature(planName: string | null | undefined, featureLabel: string): boolean {
    if (!planName) return false
    const row = ENTERPRISE_PLAN_FEATURE_MATRIX.find((r) => r.label === featureLabel)
    if (!row) return false
    const value = row.values[planName as keyof PlanFeatureRow["values"]]
    return value !== undefined && value !== false
}

/**
 * Le moins cher des forfaits souscriptibles (Business, puis Business+) qui
 * inclut `featureLabel`, ou `null` si seul "Sur Mesure" l'inclut — auquel
 * cas la fonctionnalité n'est jamais en libre-service, il faut contacter
 * l'équipe commerciale (voir CustomPlanCard). Sert au message d'upgrade de
 * SubscriptionGate.
 */
export function cheapestPlanIncluding(featureLabel: string): "Business" | "Business+" | null {
    const row = ENTERPRISE_PLAN_FEATURE_MATRIX.find((r) => r.label === featureLabel)
    if (!row) return null
    if (row.values.Business !== false) return "Business"
    if (row.values["Business+"] !== false) return "Business+"
    return null
}
