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
