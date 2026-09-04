/**
 * Questions de présélection posées aux candidats sur une offre (façon
 * LinkedIn). Aligné sur `App\Enums\JobQuestionType` côté backend.
 */

export type JobQuestionType =
    | "TEXT"
    | "TEXTAREA"
    | "NUMBER"
    | "BOOLEAN"
    | "SINGLE_CHOICE"
    | "MULTI_CHOICE"

export type JobQuestion = {
    /** Absent tant que la question n'a pas été enregistrée côté backend. */
    id?: string
    label: string
    type: JobQuestionType
    required: boolean
    /** Uniquement pour SINGLE_CHOICE / MULTI_CHOICE. */
    options: string[]
}

export const QUESTION_TYPES: { value: JobQuestionType; label: string; hint: string }[] = [
    { value: "TEXT", label: "Réponse courte", hint: "Une ligne de texte" },
    { value: "TEXTAREA", label: "Réponse longue", hint: "Plusieurs lignes" },
    { value: "NUMBER", label: "Nombre", hint: "Années d'expérience, prétentions…" },
    { value: "BOOLEAN", label: "Oui / Non", hint: "Réponse binaire" },
    { value: "SINGLE_CHOICE", label: "Choix unique", hint: "Une seule option parmi la liste" },
    { value: "MULTI_CHOICE", label: "Choix multiple", hint: "Plusieurs options possibles" },
]

/** Les seuls types dont la réponse se choisit dans une liste d'options. */
export const CHOICE_TYPES: JobQuestionType[] = ["SINGLE_CHOICE", "MULTI_CHOICE"]

export const isChoiceType = (type: JobQuestionType) => CHOICE_TYPES.includes(type)

export const QUESTION_TYPE_LABELS: Record<JobQuestionType, string> = QUESTION_TYPES.reduce(
    (acc, t) => ({ ...acc, [t.value]: t.label }),
    {} as Record<JobQuestionType, string>,
)

export const MAX_QUESTIONS = 20

export const emptyQuestion = (): JobQuestion => ({
    label: "",
    type: "TEXT",
    required: false,
    options: [],
})

/**
 * Réponse stockée telle quelle en base (toujours une liste de chaînes) rendue
 * lisible : BOOLEAN est persisté en "true"/"false", pas en français.
 */
export function formatAnswerValue(type: string, value: string[] | null | undefined): string {
    const valeurs = value ?? []
    if (valeurs.length === 0) return "—"
    if (type === "BOOLEAN") return valeurs[0] === "true" ? "Oui" : "Non"
    return valeurs.join(", ")
}
