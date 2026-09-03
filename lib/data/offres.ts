/**
 * Référentiels d'une offre d'emploi, alignés sur les enums backend
 * (`App\Enums\JobType`, `JobExperienceType`, `JobStatus`).
 *
 * Les `value` partent au backend, les `label` restent à l'écran : le formulaire
 * envoyait auparavant les libellés (« 0-2 ans d'exp. »), refusés par la
 * validation `Rule::enum(JobExperienceType::class)`.
 */

export const JOB_TYPES = [
    { value: "CDI", label: "CDI" },
    { value: "CDD", label: "CDD" },
    { value: "STAGE", label: "Stage" },
    { value: "ALTERNANCE", label: "Alternance" },
    { value: "FREELANCE", label: "Freelance" },
    { value: "TEMPS_PARTIEL", label: "Temps partiel" },
] as const

export const EXPERIENCE_LEVELS = [
    { value: "JUNIOR", label: "Junior — 0 à 2 ans" },
    { value: "INTERMEDIAIRE", label: "Intermédiaire — 3 à 5 ans" },
    { value: "SENIOR", label: "Senior — 6 à 10 ans" },
    { value: "EXPERT", label: "Expert — plus de 10 ans" },
] as const

/** Statuts d'une offre et leur rendu (badge de la liste des annonces). */
export const JOB_STATUS_META: Record<string, { label: string; className: string }> = {
    DRAFT: { label: "Brouillon", className: "bg-amber-100 text-amber-700" },
    ACTIVE: { label: "Publiée", className: "bg-green-500 text-white" },
    CLOSED: { label: "Fermée", className: "bg-red-500 text-white" },
    PAUSED: { label: "En pause", className: "bg-gray-200 text-gray-700" },
}

export const DEPARTMENTS = [
    "Technologie",
    "Design",
    "Data",
    "Marketing",
    "Management",
    "Commercial",
    "Ressources humaines",
    "Finance",
    "Support client",
    "Logistique",
] as const

const label = (liste: readonly { value: string; label: string }[], value?: string | null) =>
    liste.find((item) => item.value === value)?.label ?? value ?? "—"

export const jobTypeLabel = (value?: string | null) => label(JOB_TYPES, value)
export const experienceLabel = (value?: string | null) => label(EXPERIENCE_LEVELS, value)
