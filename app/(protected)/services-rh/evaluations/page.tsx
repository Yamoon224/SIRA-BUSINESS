"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AutocompleteInput } from "@/components/autocomplete-input"
import { ClipboardList, Plus, Trash2, BarChart3, Star, Building2, CalendarClock, Pencil } from "lucide-react"
import { SubscriptionGate } from "@/components/subscription-gate"
import { DEPARTMENTS } from "@/lib/data/rh"
import {
    employeeSurveyService,
    type IEmployeeSurvey,
    type IEmployeeSurveyStats,
    type ISurveyQuestion,
    type SurveyStatus,
} from "@/lib/api/employee-survey.service"

const STATUS_META: Record<SurveyStatus, { label: string; className: string }> = {
    DRAFT: { label: "Brouillon", className: "bg-gray-200 text-gray-700" },
    ACTIVE: { label: "Active", className: "bg-green-500 text-white" },
    CLOSED: { label: "Clôturée", className: "bg-red-500 text-white" },
}

function newQuestion(): ISurveyQuestion {
    return { id: crypto.randomUUID(), question: "", type: "RATING" }
}

function EvaluationsContent() {
    const [surveys, setSurveys] = useState<IEmployeeSurvey[]>([])
    const [loading, setLoading] = useState(true)

    const [createOpen, setCreateOpen] = useState(false)
    // `null` = création ; sinon id de l'évaluation en cours de modification.
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingHasResponses, setEditingHasResponses] = useState(false)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [questions, setQuestions] = useState<ISurveyQuestion[]>([newQuestion()])
    const [dueDate, setDueDate] = useState("")
    const [department, setDepartment] = useState("")
    const [creating, setCreating] = useState(false)

    const [statsFor, setStatsFor] = useState<IEmployeeSurvey | null>(null)
    const [stats, setStats] = useState<IEmployeeSurveyStats | null>(null)
    const [statsLoading, setStatsLoading] = useState(false)

    const load = async () => {
        setLoading(true)
        try {
            const res = await employeeSurveyService.list()
            setSurveys(((res as any)?.data ?? res) as IEmployeeSurvey[])
        } catch (err) {
            console.error("[evaluations] load error:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const resetForm = () => {
        setTitle("")
        setDescription("")
        setQuestions([newQuestion()])
        setDueDate("")
        setDepartment("")
    }

    const openCreate = () => {
        setEditingId(null)
        setEditingHasResponses(false)
        resetForm()
        setCreateOpen(true)
    }

    const openEdit = (survey: IEmployeeSurvey) => {
        setEditingId(survey.id)
        setEditingHasResponses(survey.hasResponses)
        setTitle(survey.title)
        setDescription(survey.description ?? "")
        setQuestions(survey.questions.length > 0 ? survey.questions : [newQuestion()])
        setDueDate(survey.dueDate ?? "")
        setDepartment(survey.department ?? "")
        setCreateOpen(true)
    }

    const handleSubmit = async () => {
        const validQuestions = questions.filter((q) => q.question.trim())
        if (!title.trim() || validQuestions.length === 0) return
        setCreating(true)
        try {
            if (editingId) {
                await employeeSurveyService.update(editingId, {
                    title: title.trim(),
                    description: description.trim() || null,
                    // Verrouillées côté API dès qu'une réponse existe - inutile de
                    // les renvoyer, et ça éviterait un 400 pour rien.
                    ...(editingHasResponses ? {} : { questions: validQuestions }),
                    dueDate: dueDate || null,
                    department: department.trim() || null,
                })
            } else {
                await employeeSurveyService.create({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    questions: validQuestions,
                    dueDate: dueDate || null,
                    department: department.trim() || null,
                })
            }
            setCreateOpen(false)
            resetForm()
            await load()
        } catch (err) {
            console.error("[evaluations] save error:", err)
        } finally {
            setCreating(false)
        }
    }

    const handleStatusChange = async (survey: IEmployeeSurvey, status: SurveyStatus) => {
        try {
            await employeeSurveyService.updateStatus(survey.id, status)
            setSurveys((prev) => prev.map((s) => s.id === survey.id ? { ...s, status } : s))
        } catch (err) {
            console.error("[evaluations] status update error:", err)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await employeeSurveyService.remove(id)
            setSurveys((prev) => prev.filter((s) => s.id !== id))
        } catch (err) {
            console.error("[evaluations] delete error:", err)
        }
    }

    const openStats = async (survey: IEmployeeSurvey) => {
        setStatsFor(survey)
        setStats(null)
        setStatsLoading(true)
        try {
            const res = await employeeSurveyService.stats(survey.id)
            setStats((res as any)?.data ?? res)
        } catch (err) {
            console.error("[evaluations] stats error:", err)
        } finally {
            setStatsLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Évaluations employés"
                description="Enquêtes internes anonymes : les réponses ne sont jamais individuellement identifiables."
                actions={
                    <Button className="gap-1.5 bg-blue-500 hover:bg-blue-600" onClick={openCreate}>
                        <Plus className="h-4 w-4" />Nouvelle enquête
                    </Button>
                }
            />

            {surveys.length === 0 ? (
                <Card className="border border-border">
                    <CardContent className="p-12 text-center text-muted-foreground">
                        <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Aucune enquête pour le moment.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {surveys.map((survey) => (
                        <div key={survey.id} className="rounded-xl border border-border bg-white px-4 py-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-foreground">{survey.title}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_META[survey.status].className}`}>
                                            {STATUS_META[survey.status].label}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        <span>{survey.questions.length} question(s)</span>
                                        {survey.department && (
                                            <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{survey.department}</span>
                                        )}
                                        {survey.dueDate && (
                                            <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />Échéance {new Date(survey.dueDate).toLocaleDateString("fr-FR")}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Select value={survey.status} onValueChange={(v) => handleStatusChange(survey, v as SurveyStatus)}>
                                        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DRAFT">Brouillon</SelectItem>
                                            <SelectItem value="ACTIVE">Active</SelectItem>
                                            <SelectItem value="CLOSED">Clôturée</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openEdit(survey)}>
                                        <Pencil className="h-3.5 w-3.5" />Modifier
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openStats(survey)}>
                                        <BarChart3 className="h-3.5 w-3.5" />Statistiques
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDelete(survey.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Créer / modifier une enquête */}
            <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setEditingId(null); setEditingHasResponses(false) } }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{editingId ? "Modifier l'enquête" : "Nouvelle enquête"}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'enquête" />
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optionnel)" className="min-h-[60px]" />

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <p className="mb-1 text-xs text-muted-foreground">Département ciblé (optionnel)</p>
                                <AutocompleteInput
                                    value={department}
                                    onChange={setDepartment}
                                    options={DEPARTMENTS}
                                    placeholder="Toute l'entreprise"
                                    aria-label="Département ciblé"
                                />
                            </div>
                            <div>
                                <p className="mb-1 text-xs text-muted-foreground">Échéance (optionnel)</p>
                                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Sans département, l&apos;évaluation est visible par toute l&apos;entreprise. Passée l&apos;échéance, une évaluation active se clôture automatiquement.
                        </p>

                        <div className="space-y-2">
                            <p className="text-xs font-medium text-foreground">Questions</p>
                            {editingHasResponses && (
                                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                    Cette enquête a déjà reçu des réponses : les questions ne sont plus modifiables (titre, échéance et département le restent).
                                </p>
                            )}
                            <fieldset disabled={editingHasResponses} className="space-y-2 disabled:opacity-60">
                                {questions.map((q, i) => (
                                    <div key={q.id} className="flex items-center gap-2">
                                        <Input
                                            value={q.question}
                                            onChange={(e) => setQuestions((prev) => prev.map((p, idx) => idx === i ? { ...p, question: e.target.value } : p))}
                                            placeholder={`Question ${i + 1}`}
                                            className="flex-1"
                                        />
                                        <Select
                                            value={q.type}
                                            onValueChange={(v) => setQuestions((prev) => prev.map((p, idx) => idx === i ? { ...p, type: v as ISurveyQuestion["type"] } : p))}
                                            disabled={editingHasResponses}
                                        >
                                            <SelectTrigger className="h-9 w-28 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="RATING">Note</SelectItem>
                                                <SelectItem value="TEXT">Texte</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 shrink-0 text-red-500 hover:bg-red-50"
                                            disabled={questions.length === 1}
                                            onClick={() => setQuestions((prev) => prev.filter((_, idx) => idx !== i))}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setQuestions((prev) => [...prev, newQuestion()])}>
                                    <Plus className="h-3.5 w-3.5" />Ajouter une question
                                </Button>
                            </fieldset>
                        </div>

                        <DialogFooter>
                            <Button disabled={creating || !title.trim()} onClick={handleSubmit} className="w-full bg-blue-500 hover:bg-blue-600">
                                {creating ? "Enregistrement..." : editingId ? "Enregistrer les modifications" : "Créer l'enquête"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Statistiques */}
            <Dialog open={!!statsFor} onOpenChange={(open) => !open && setStatsFor(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Statistiques - {statsFor?.title}</DialogTitle></DialogHeader>
                    {statsLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                        </div>
                    ) : stats ? (
                        <div className="space-y-4 text-sm">
                            <p className="text-muted-foreground">{stats.participationCount} réponse(s) reçue(s)</p>
                            {statsFor && Object.keys(stats.ratings).length > 0 && (
                                <div className="space-y-1.5">
                                    {statsFor.questions.filter((q) => q.type === "RATING").map((q) => (
                                        <div key={q.id} className="flex items-center justify-between">
                                            <span className="text-xs text-foreground">{q.question}</span>
                                            <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                {stats.ratings[q.id] ?? "-"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {stats.trends.length > 0 && (
                                <div>
                                    <p className="mb-1 text-xs font-medium text-foreground">Tendances (analyse IA)</p>
                                    <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                                        {stats.trends.map((t, i) => <li key={i}>{t}</li>)}
                                    </ul>
                                </div>
                            )}
                            {stats.frictionPoints.length > 0 && (
                                <div>
                                    <p className="mb-1 text-xs font-medium text-foreground">Points de friction</p>
                                    <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                                        {stats.frictionPoints.map((t, i) => <li key={i}>{t}</li>)}
                                    </ul>
                                </div>
                            )}
                            {stats.recommendations.length > 0 && (
                                <div>
                                    <p className="mb-1 text-xs font-medium text-foreground">Recommandations</p>
                                    <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                                        {stats.recommendations.map((t, i) => <li key={i}>{t}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default function Page() {
    return (
        <SubscriptionGate featureLabel="les évaluations des employés">
            <EvaluationsContent />
        </SubscriptionGate>
    )
}
