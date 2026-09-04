"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AutocompleteInput } from "@/components/autocomplete-input"
import { createJobOffer, getJobOffer, updateJobOffer } from "@/actions/offers"
import { extractApiErrorMessage } from "@/lib/api-error"
import { LOCALISATIONS } from "@/lib/data/afrique"
import { DEPARTMENTS, EXPERIENCE_LEVELS, JOB_TYPES } from "@/lib/data/offres"
import { isChoiceType, type JobQuestion } from "@/lib/data/questions"
import { JobQuestionsEditor } from "@/components/job-questions-editor"
import { Calendar, FileText, Loader2, MapPin, Plus, Send, X } from "lucide-react"

/** Champs du formulaire, tous en chaîne : la conversion se fait à l'envoi. */
type FormState = {
    title: string
    department: string
    location: string
    type: string
    salaryMin: string
    salaryMax: string
    experience: string
    description: string
    benefits: string
    publishDate: string
    endDate: string
    visibility: string
}

const FORM_VIDE: FormState = {
    title: "",
    department: "",
    location: "",
    type: "",
    salaryMin: "",
    salaryMax: "",
    experience: "",
    description: "",
    benefits: "",
    publishDate: "",
    endDate: "",
    visibility: "PUBLIC",
}

/**
 * Erreurs affichées sous les champs. `skills` ne vient pas de `FormState` :
 * la liste de compétences est un état à part, mais elle est exigée à la
 * publication comme les autres.
 */
type Erreurs = Partial<Record<keyof FormState | "skills", string>>

/** Libellés utilisés dans les messages d'erreur, alignés sur ceux du backend. */
const LIBELLES: Partial<Record<keyof FormState | "salary", string>> = {
    title: "Titre du poste",
    location: "Localisation",
    type: "Type de contrat",
    experience: "Expérience requise",
    salary: "Salaire",
    description: "Description du poste",
    benefits: "Avantages offerts",
    publishDate: "Date de publication",
    endDate: "Date limite de candidature",
}

/** Sépare « 450000 - 650000 FCFA » en ses deux bornes pour rouvrir un brouillon. */
function separerSalaire(salaire?: string | null): { salaryMin: string; salaryMax: string } {
    const nombres = (salaire ?? "").match(/\d[\d\s.]*/g) ?? []
    const nettoie = (v?: string) => (v ?? "").replace(/[\s.]/g, "")
    return { salaryMin: nettoie(nombres[0]), salaryMax: nettoie(nombres[1]) }
}

/** Date ISO complète (backend) → « aaaa-mm-jj » attendu par `<input type="date">`. */
function versChampDate(valeur?: string | null): string {
    if (!valeur) return ""
    const iso = String(valeur)
    return /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : ""
}

export default function Content() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { data: session } = useSession()

    // Présence d'un `id` : on reprend une offre existante (typiquement un
    // brouillon) au lieu d'en créer une.
    const offerId = searchParams.get("id")

    const [aiOptimization, setAiOptimization] = useState(true)
    const [showCover, setShowCover] = useState(true)
    const [newSkill, setNewSkill] = useState("")
    const [skills, setSkills] = useState<string[]>([])
    const [questions, setQuestions] = useState<JobQuestion[]>([])
    const [questionErrors, setQuestionErrors] = useState<Record<number, string>>({})
    const [formData, setFormData] = useState<FormState>(FORM_VIDE)
    const [status, setStatus] = useState<string>("DRAFT")
    const [loading, setLoading] = useState(!!offerId)
    const [saving, setSaving] = useState<"draft" | "publish" | null>(null)
    const [errors, setErrors] = useState<Erreurs>({})

    useEffect(() => {
        if (!offerId) return
        let annule = false

        getJobOffer(offerId)
            .then((res) => {
                const offre = ((res as any)?.data ?? res) as any
                if (annule || !offre?.id) return
                setFormData({
                    ...FORM_VIDE,
                    title: offre.title ?? "",
                    location: offre.location ?? "",
                    type: offre.type ?? "",
                    experience: offre.experience ?? "",
                    description: offre.description ?? "",
                    benefits: offre.benefits ?? "",
                    publishDate: versChampDate(offre.publishDate),
                    endDate: versChampDate(offre.endDate),
                    ...separerSalaire(offre.salary),
                })
                setSkills(Array.isArray(offre.requirements) ? offre.requirements : [])
                setQuestions(
                    (Array.isArray(offre.questions) ? offre.questions : []).map((q: any) => ({
                        id: q.id,
                        label: q.label ?? "",
                        type: q.type ?? "TEXT",
                        required: !!q.required,
                        options: Array.isArray(q.options) ? q.options : [],
                    })),
                )
                setStatus(offre.status ?? "DRAFT")
            })
            .catch((err) => {
                console.error("[poster-offre] chargement de l'offre :", err)
                toast.error(extractApiErrorMessage(err, "Impossible de charger cette offre."))
            })
            .finally(() => !annule && setLoading(false))

        return () => {
            annule = true
        }
    }, [offerId])

    const setChamp = <K extends keyof FormState>(champ: K, valeur: FormState[K]) => {
        setFormData((prev) => ({ ...prev, [champ]: valeur }))
        setErrors((prev) => (prev[champ] ? { ...prev, [champ]: undefined } : prev))
    }

    const addSkill = () => {
        const value = newSkill.trim()
        if (value.length > 0 && !skills.includes(value)) {
            setSkills((prev) => [...prev, value])
            setNewSkill("")
            setErrors((prev) => (prev.skills ? { ...prev, skills: undefined } : prev))
        }
    }

    const removeSkill = (skill: string) => setSkills((prev) => prev.filter((s) => s !== skill))

    /**
     * Salaire envoyé au backend, qui n'a qu'une colonne texte : « min - max »
     * quand les deux bornes sont saisies, la seule borne connue sinon.
     */
    const salaire = () => {
        const min = formData.salaryMin.trim()
        const max = formData.salaryMax.trim()
        if (min && max) return `${min} - ${max} FCFA`
        if (min || max) return `${min || max} FCFA`
        return ""
    }

    /**
     * Questions mal formées : contrôlé même sur un brouillon, parce que le
     * backend les refuse dans les deux cas (une question sans libellé est
     * ignorée, une question à choix sans option renvoie un 422).
     */
    const validerQuestions = () => {
        const manquants: Record<number, string> = {}

        questions.forEach((question, index) => {
            if (question.label.trim() === "") {
                manquants[index] = "Saisissez le libellé de la question."
            } else if (isChoiceType(question.type) && question.options.length === 0) {
                manquants[index] = "Ajoutez au moins une réponse proposée."
            }
        })

        setQuestionErrors(manquants)
        return Object.keys(manquants).length === 0
    }

    /**
     * Contrôles réclamés avant publication. Un brouillon n'en subit aucun
     * (hors titre) : c'est tout l'intérêt de pouvoir le reprendre plus tard.
     */
    const validerPourPublication = () => {
        const manquants: Erreurs = {}
        const requis: (keyof FormState)[] = [
            "title",
            "location",
            "type",
            "experience",
            "description",
            "benefits",
            "publishDate",
            "endDate",
        ]

        requis.forEach((champ) => {
            if (!formData[champ].trim()) manquants[champ] = `${LIBELLES[champ]} est obligatoire.`
        })
        if (!salaire()) manquants.salaryMin = "Indiquez au moins un salaire minimum."
        if (skills.length === 0) {
            manquants.skills = "Ajoutez au moins une compétence ou exigence attendue."
        }
        if (
            formData.publishDate &&
            formData.endDate &&
            formData.endDate < formData.publishDate
        ) {
            manquants.endDate = "La date limite doit suivre la date de publication."
        }

        setErrors(manquants)
        return Object.keys(manquants).length === 0
    }

    const payload = (statutCible: "DRAFT" | "ACTIVE") => ({
        title: formData.title.trim(),
        location: formData.location.trim() || null,
        type: formData.type || null,
        salary: salaire() || null,
        experience: formData.experience || null,
        description: formData.description.trim() || null,
        benefits: formData.benefits.trim() || null,
        publishDate: formData.publishDate || null,
        endDate: formData.endDate || null,
        requirements: skills.length > 0 ? skills : null,
        // Toujours envoyé (même vide) : c'est ce qui permet de supprimer la
        // dernière question d'une offre - omettre la clé les laisserait en place.
        questions: questions.map((question) => ({
            id: question.id,
            label: question.label.trim(),
            type: question.type,
            required: question.required,
            options: isChoiceType(question.type) ? question.options : null,
        })),
        status: statutCible,
        companyId: session?.user?.companyId,
    })

    const enregistrer = async (statutCible: "DRAFT" | "ACTIVE") => {
        if (!validerQuestions()) {
            toast.error("Complétez les questions signalées.")
            return
        }
        if (statutCible === "ACTIVE" && !validerPourPublication()) {
            toast.error("Complétez les champs signalés avant de publier.")
            return
        }
        if (statutCible === "DRAFT" && !formData.title.trim()) {
            setErrors({ title: "Donnez un titre au brouillon pour le retrouver." })
            toast.error("Un titre est nécessaire pour enregistrer le brouillon.")
            return
        }

        const companyId = session?.user?.companyId
        if (!companyId) {
            toast.error("Session expirée : reconnectez-vous pour publier une offre.")
            return
        }

        setSaving(statutCible === "ACTIVE" ? "publish" : "draft")
        try {
            // ✅ Appel relayé via /api/proxy : le Bearer token est attaché côté serveur
            // à partir de la session NextAuth, sans jamais transiter par le client.
            if (offerId) {
                await updateJobOffer(offerId, payload(statutCible) as any)
            } else {
                await createJobOffer(payload(statutCible))
            }
            toast.success(
                statutCible === "ACTIVE" ? "Offre publiée." : "Brouillon enregistré.",
            )
            router.push("/annonces")
        } catch (error) {
            console.error("[poster-offre] enregistrement :", error)
            toast.error(
                extractApiErrorMessage(
                    error,
                    statutCible === "ACTIVE"
                        ? "La publication de l'offre a échoué."
                        : "L'enregistrement du brouillon a échoué.",
                ),
            )
        } finally {
            setSaving(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const estBrouillon = status === "DRAFT"

    return (
        <div className="space-y-6 pb-8">
            <PageHeader
                title={offerId ? "Modifier l'offre d'emploi" : "Publier une offre d'emploi"}
                description={
                    offerId
                        ? "Ajustez le contenu de votre offre : les modifications sont visibles dès l'enregistrement."
                        : "Décrivez le poste, les compétences attendues et les questions de présélection posées aux candidats."
                }
                actions={
                    offerId ? (
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                estBrouillon ? "bg-amber-100 text-amber-700" : "bg-green-500 text-white"
                            }`}
                        >
                            {estBrouillon ? "Brouillon" : "Publiée"}
                        </span>
                    ) : null
                }
            />
            <p className="text-sm font-medium text-muted-foreground">
                {estBrouillon
                    ? "Enregistrez à tout moment : un brouillon n'est visible que de votre entreprise et se complète plus tard."
                    : "Créez une offre optimisée par Goriya pour attirer les meilleurs talents."}
            </p>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="space-y-4 xl:col-span-2">
                    <section className="rounded-xl border border-border bg-white p-4 sm:p-5">
                        <h2 className="mb-4 text-sm font-semibold text-foreground">Informations de base</h2>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Titre du poste" required error={errors.title} className="md:col-span-2">
                                <Input
                                    placeholder="ex : Développeur Full-Stack Senior"
                                    aria-invalid={!!errors.title}
                                    value={formData.title}
                                    onChange={(e) => setChamp("title", e.target.value)}
                                />
                            </Field>

                            <Field label="Département" hint="Facultatif">
                                <Select
                                    value={formData.department}
                                    onValueChange={(value) => setChamp("department", value)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Sélectionner un département" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DEPARTMENTS.map((item) => (
                                            <SelectItem key={item} value={item}>
                                                {item}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Localisation" required error={errors.location}>
                                <div className="relative">
                                    <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <AutocompleteInput
                                        value={formData.location}
                                        onChange={(v) => setChamp("location", v)}
                                        options={LOCALISATIONS}
                                        placeholder="Ville, Pays"
                                        className="pl-9"
                                        aria-label="Localisation du poste"
                                    />
                                </div>
                            </Field>

                            <Field label="Type de contrat" required error={errors.type}>
                                <Select value={formData.type} onValueChange={(value) => setChamp("type", value)}>
                                    <SelectTrigger className="w-full" aria-invalid={!!errors.type}>
                                        <SelectValue placeholder="Sélectionner un type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {JOB_TYPES.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Expérience requise" required error={errors.experience}>
                                <Select
                                    value={formData.experience}
                                    onValueChange={(value) => setChamp("experience", value)}
                                >
                                    <SelectTrigger className="w-full" aria-invalid={!!errors.experience}>
                                        <SelectValue placeholder="Sélectionner un niveau" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EXPERIENCE_LEVELS.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Salaire minimum (FCFA)" required error={errors.salaryMin}>
                                <Input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    placeholder="450000"
                                    aria-invalid={!!errors.salaryMin}
                                    value={formData.salaryMin}
                                    onChange={(e) => setChamp("salaryMin", e.target.value)}
                                />
                            </Field>

                            <Field label="Salaire maximum (FCFA)" hint="Facultatif">
                                <Input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    placeholder="650000"
                                    value={formData.salaryMax}
                                    onChange={(e) => setChamp("salaryMax", e.target.value)}
                                />
                            </Field>
                        </div>
                    </section>

                    <section className="rounded-xl border border-border bg-white p-4 sm:p-5">
                        <h2 className="mb-4 text-sm font-semibold text-foreground">Description du poste</h2>

                        <div className="space-y-4">
                            <Field label="Description complète" required error={errors.description}>
                                <Textarea
                                    rows={5}
                                    placeholder="Décrivez le poste, les responsabilités et l'environnement de travail..."
                                    aria-invalid={!!errors.description}
                                    value={formData.description}
                                    onChange={(e) => setChamp("description", e.target.value)}
                                />
                            </Field>

                            <Field label="Avantages offerts" required error={errors.benefits}>
                                <Textarea
                                    rows={3}
                                    placeholder="Télétravail, mutuelle, tickets restaurant, formations..."
                                    aria-invalid={!!errors.benefits}
                                    value={formData.benefits}
                                    onChange={(e) => setChamp("benefits", e.target.value)}
                                />
                            </Field>
                        </div>
                    </section>

                    <section className="rounded-xl border border-border bg-white p-4 sm:p-5">
                        <h2 className="text-sm font-semibold text-foreground">
                            Compétences et exigences
                            <span className="ml-0.5 text-destructive">*</span>
                        </h2>
                        <p className="mb-4 mt-1 text-xs text-muted-foreground">
                            Une entrée par compétence ou qualification attendue : elles sont affichées
                            sur l&apos;offre et servent au scoring des candidatures.
                        </p>

                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="ex : React, 3 ans en gestion de projet, anglais courant"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault()
                                        addSkill()
                                    }
                                }}
                            />
                            <Button type="button" variant="outline" size="icon" onClick={addSkill} aria-label="Ajouter">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        {errors.skills && <p className="mt-1 text-xs text-destructive">{errors.skills}</p>}

                        {skills.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {skills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground"
                                    >
                                        {skill}
                                        <button
                                            type="button"
                                            onClick={() => removeSkill(skill)}
                                            className="text-muted-foreground transition-colors hover:text-foreground"
                                            aria-label={`Retirer ${skill}`}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </section>

                    <JobQuestionsEditor
                        questions={questions}
                        onChange={setQuestions}
                        errors={questionErrors}
                    />

                    <section className="rounded-xl border border-primary/40 bg-secondary/60 p-4 sm:p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold text-foreground">Optimisation Goriya</h2>
                            <Switch checked={aiOptimization} onCheckedChange={setAiOptimization} />
                        </div>

                        <div className="rounded-lg border border-border bg-white p-3">
                            <p className="mb-1 text-xs font-semibold text-foreground">Activer l&apos;optimisation Goriya</p>
                            <p className="text-xs text-muted-foreground">
                                L&apos;IA analysera et optimisera votre annonce pour améliorer sa visibilité et son attractivité.
                            </p>
                        </div>

                        <div className="mt-3 rounded-lg border border-border bg-white p-3">
                            <p className="mb-2 text-xs font-semibold text-foreground">Suggestions automatiques :</p>
                            <ul className="space-y-1 text-xs text-muted-foreground">
                                <li>• Analyse SEO du titre et des mots-clés</li>
                                <li>• Optimisation de la description pour le matching</li>
                                <li>• Suggestion de compétences complémentaires</li>
                                <li>• Analyse comparative avec le marché</li>
                            </ul>
                        </div>
                    </section>

                    <section className="rounded-xl border border-border bg-white p-4 sm:p-5">
                        <h2 className="mb-4 text-sm font-semibold text-foreground">Options de publication</h2>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Date de publication" required error={errors.publishDate}>
                                <div className="relative">
                                    <Input
                                        type="date"
                                        aria-invalid={!!errors.publishDate}
                                        value={formData.publishDate}
                                        onChange={(e) => setChamp("publishDate", e.target.value)}
                                    />
                                    <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                </div>
                            </Field>
                            <Field label="Date limite de candidature" required error={errors.endDate}>
                                <div className="relative">
                                    <Input
                                        type="date"
                                        min={formData.publishDate || undefined}
                                        aria-invalid={!!errors.endDate}
                                        value={formData.endDate}
                                        onChange={(e) => setChamp("endDate", e.target.value)}
                                    />
                                    <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                </div>
                            </Field>
                        </div>

                        <fieldset className="mt-5 space-y-2">
                            <legend className="mb-1.5 text-sm font-medium text-foreground">Visibilité</legend>
                            <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                <input
                                    type="radio"
                                    name="visibility"
                                    className="accent-primary"
                                    checked={formData.visibility === "PUBLIC"}
                                    onChange={() => setChamp("visibility", "PUBLIC")}
                                />
                                Public - visible par tous les candidats
                            </label>
                            <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                <input
                                    type="radio"
                                    name="visibility"
                                    className="accent-primary"
                                    checked={formData.visibility === "PREMIUM"}
                                    onChange={() => setChamp("visibility", "PREMIUM")}
                                />
                                Premium - mise en avant dans les résultats de recherche
                            </label>
                        </fieldset>
                    </section>

                    <div className="flex flex-col items-stretch justify-end gap-3 pt-2 sm:flex-row sm:items-center">
                        {/* Sur une offre déjà publiée, ce bouton la dépublierait
                            sans le dire : il n'apparaît qu'à la création et sur
                            un brouillon. */}
                        {estBrouillon && (
                            <Button
                                variant="outline"
                                className="rounded-full px-6"
                                disabled={saving !== null}
                                onClick={() => enregistrer("DRAFT")}
                            >
                                {saving === "draft" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <FileText className="h-4 w-4" />
                                )}
                                Enregistrer comme brouillon
                            </Button>
                        )}
                        <Button
                            className="rounded-full px-6"
                            disabled={saving !== null}
                            onClick={() => enregistrer("ACTIVE")}
                        >
                            {saving === "publish" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            {offerId && !estBrouillon ? "Enregistrer et publier" : "Publier l'offre"}
                        </Button>
                    </div>
                </div>

                <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
                    <p className="text-sm font-semibold text-foreground">Aperçu</p>
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium text-muted-foreground">Afficher la photo de couverture</p>
                        <Switch checked={showCover} onCheckedChange={setShowCover} />
                    </div>

                    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                        <div className="p-3">
                            <p className="text-sm font-semibold text-foreground">
                                {formData.title.trim() || "Titre de votre offre"}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                                {[
                                    JOB_TYPES.find((t) => t.value === formData.type)?.label,
                                    formData.department,
                                    formData.location,
                                ]
                                    .filter(Boolean)
                                    .join(" • ") || "Type de contrat • Département • Localisation"}
                            </p>
                        </div>

                        {showCover && (
                            <div className="h-24 w-full border-t border-border bg-brand-gradient" />
                        )}

                        <div className="space-y-1 p-3">
                            <p className="text-[11px] text-muted-foreground">{salaire() || "Salaire à préciser"}</p>
                            <p className="line-clamp-3 text-[11px] text-muted-foreground">
                                {formData.description.trim() || "La description apparaîtra ici au fil de votre saisie."}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-white p-3">
                        <p className="text-xs text-muted-foreground">
                            Un brouillon reste privé : il n&apos;apparaît ni dans la recherche
                            d&apos;emploi, ni sur votre page publique, tant qu&apos;il n&apos;est pas publié.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    )
}

type FieldProps = {
    label: string
    children: React.ReactNode
    className?: string
    required?: boolean
    hint?: string
    error?: string
}

/**
 * Enveloppe commune des champs : même typographie de libellé, même espacement,
 * même emplacement pour l'aide et pour l'erreur - c'est ce qui donne au
 * formulaire son alignement visuel d'un bloc à l'autre.
 */
function Field({ label, children, className = "", required, hint, error }: FieldProps) {
    return (
        <div className={className}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                    {label}
                    {required && <span className="ml-0.5 text-destructive">*</span>}
                </p>
                {hint && !error && <span className="text-[11px] text-muted-foreground">{hint}</span>}
            </div>
            {children}
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
    )
}
