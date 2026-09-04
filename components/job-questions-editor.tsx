"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2, X } from "lucide-react"
import {
    MAX_QUESTIONS,
    QUESTION_TYPES,
    emptyQuestion,
    isChoiceType,
    type JobQuestion,
    type JobQuestionType,
} from "@/lib/data/questions"

type Props = {
    questions: JobQuestion[]
    onChange: (questions: JobQuestion[]) => void
    /** Erreurs de validation, indexées comme `questions`. */
    errors?: Record<number, string>
}

/**
 * Éditeur des questions posées au candidat lors de sa candidature. L'ordre de
 * la liste est celui du wizard côté candidat : les flèches le réordonnent.
 */
export function JobQuestionsEditor({ questions, onChange, errors = {} }: Props) {
    const patch = (index: number, valeurs: Partial<JobQuestion>) =>
        onChange(questions.map((q, i) => (i === index ? { ...q, ...valeurs } : q)))

    const ajouter = () => {
        if (questions.length >= MAX_QUESTIONS) return
        onChange([...questions, emptyQuestion()])
    }

    const supprimer = (index: number) => onChange(questions.filter((_, i) => i !== index))

    const deplacer = (index: number, delta: number) => {
        const cible = index + delta
        if (cible < 0 || cible >= questions.length) return
        const copie = [...questions]
        ;[copie[index], copie[cible]] = [copie[cible], copie[index]]
        onChange(copie)
    }

    /**
     * Changer de type ne doit pas laisser d'options orphelines derrière lui :
     * elles ne seraient plus visibles mais repartiraient au backend.
     */
    const changerType = (index: number, type: JobQuestionType) =>
        patch(index, { type, options: isChoiceType(type) ? questions[index].options : [] })

    return (
        <section className="rounded-xl border border-border bg-white p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-foreground">Questions posées aux candidats</h2>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
                Ajoutez les questions auxquelles chaque candidat devra répondre au moment de
                postuler. Une question marquée obligatoire bloque l&apos;envoi de la candidature
                tant qu&apos;elle est sans réponse.
            </p>

            {questions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                        Aucune question pour l&apos;instant - les candidats postuleront avec leur
                        profil et leur CV uniquement.
                    </p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {questions.map((question, index) => (
                        <li key={index} className="rounded-lg border border-border bg-muted/30 p-3">
                            <div className="mb-2 flex items-center gap-2">
                                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-xs font-semibold text-muted-foreground">
                                    Question {index + 1}
                                </span>
                                <div className="ml-auto flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        disabled={index === 0}
                                        onClick={() => deplacer(index, -1)}
                                        aria-label={`Remonter la question ${index + 1}`}
                                    >
                                        <ArrowUp className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        disabled={index === questions.length - 1}
                                        onClick={() => deplacer(index, 1)}
                                        aria-label={`Descendre la question ${index + 1}`}
                                    >
                                        <ArrowDown className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => supprimer(index)}
                                        aria-label={`Supprimer la question ${index + 1}`}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            <Input
                                placeholder="ex : Combien d'années d'expérience avez-vous en React ?"
                                value={question.label}
                                aria-invalid={!!errors[index]}
                                onChange={(e) => patch(index, { label: e.target.value })}
                            />
                            {errors[index] && (
                                <p className="mt-1 text-xs text-destructive">{errors[index]}</p>
                            )}

                            <div className="mt-3 flex flex-wrap items-center gap-4">
                                <Select
                                    value={question.type}
                                    onValueChange={(value) => changerType(index, value as JobQuestionType)}
                                >
                                    <SelectTrigger className="w-full sm:w-64">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {QUESTION_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                    {type.hint}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                                    <Switch
                                        checked={question.required}
                                        onCheckedChange={(checked) => patch(index, { required: checked })}
                                    />
                                    Réponse obligatoire
                                </label>
                            </div>

                            {isChoiceType(question.type) && (
                                <OptionsEditor
                                    options={question.options}
                                    onChange={(options) => patch(index, { options })}
                                />
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <Button
                type="button"
                variant="outline"
                className="mt-3 rounded-full"
                disabled={questions.length >= MAX_QUESTIONS}
                onClick={ajouter}
            >
                <Plus className="h-4 w-4" />
                Ajouter une question
            </Button>
            {questions.length >= MAX_QUESTIONS && (
                <p className="mt-1 text-xs text-muted-foreground">
                    Limite de {MAX_QUESTIONS} questions atteinte.
                </p>
            )}
        </section>
    )
}

/** Liste d'options d'une question à choix, avec ajout au clavier (Entrée). */
function OptionsEditor({
    options,
    onChange,
}: {
    options: string[]
    onChange: (options: string[]) => void
}) {
    const [saisie, setSaisie] = useState("")

    const ajouter = () => {
        const valeur = saisie.trim()
        if (valeur === "" || options.includes(valeur)) return
        onChange([...options, valeur])
        setSaisie("")
    }

    return (
        <div className="mt-3 rounded-lg border border-border bg-white p-3">
            <p className="mb-2 text-xs font-medium text-foreground">Réponses proposées</p>
            <div className="flex items-center gap-2">
                <Input
                    placeholder="ex : Courant"
                    value={saisie}
                    onChange={(e) => setSaisie(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault()
                            ajouter()
                        }
                    }}
                />
                <Button type="button" variant="outline" size="icon" onClick={ajouter} aria-label="Ajouter une option">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {options.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                    {options.map((option) => (
                        <span
                            key={option}
                            className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground"
                        >
                            {option}
                            <button
                                type="button"
                                onClick={() => onChange(options.filter((o) => o !== option))}
                                className="text-muted-foreground transition-colors hover:text-foreground"
                                aria-label={`Retirer ${option}`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                    Ajoutez au moins une réponse : sans options, la question ne peut pas être posée.
                </p>
            )}
        </div>
    )
}
