"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Briefcase, CalendarClock, Handshake, Search, Send, UserCheck, Users } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmployeeAvatar } from "@/components/rh/employee-avatar"
import { InterviewList } from "@/components/rh/interview-list"
import { KpiCard } from "@/components/rh/kpi-card"
import { CandidateActionsMenu, useRecruitmentWorkflow } from "@/components/rh/recruitment-actions"
import { RecruitmentBoard, splitName } from "@/components/rh/recruitment-board"
import { StatusPill } from "@/components/rh/status-pill"
import {
    ACTIVE_RECRUITMENT_STAGES,
    RECRUITMENT_STAGES,
    RECRUITMENT_STAGE_META,
    addDaysIso,
    formatDate,
    formatDateTime,
    normaliseText,
    todayIso,
} from "@/lib/data/rh"
import { JOB_STATUS_META, jobTypeLabel } from "@/lib/data/offres"
import { extractApiErrorMessage } from "@/lib/api-error"
import {
    recruitmentService,
    type IRecruitmentCandidate,
    type IRecruitmentInterview,
    type IRecruitmentJobOffer,
    type RecruitmentStage,
} from "@/lib/api/recruitment.service"

const ALL = "all"
const DAY = 86_400_000

/**
 * Page Recrutements : les candidatures reçues sur les offres, suivies en
 * pipeline jusqu'à l'embauche, avec leurs entretiens.
 */
export function RecrutementsContent() {
    const [candidates, setCandidates] = useState<IRecruitmentCandidate[]>([])
    const [offers, setOffers] = useState<IRecruitmentJobOffer[]>([])
    const [interviews, setInterviews] = useState<IRecruitmentInterview[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [tab, setTab] = useState("pipeline")
    const [offerId, setOfferId] = useState<string>(ALL)
    const [query, setQuery] = useState("")

    const load = useCallback(async () => {
        try {
            // Entretiens des deux derniers mois et à venir : agenda et comptes rendus en retard.
            const [candidateList, offerList, interviewList] = await Promise.all([
                recruitmentService.candidates(),
                recruitmentService.jobOffers(),
                recruitmentService.interviews({ from: addDaysIso(todayIso(), -60) }),
            ])
            setCandidates(candidateList)
            setOffers(offerList)
            setInterviews(interviewList)
            setLoadError(null)
        } catch (err) {
            setLoadError(extractApiErrorMessage(err, "Impossible de charger le pipeline de recrutement."))
        }
    }, [])

    useEffect(() => {
        void load().finally(() => setLoading(false))
    }, [load])

    const workflow = useRecruitmentWorkflow({ onChanged: load })

    const filtered = useMemo(() => {
        const q = normaliseText(query.trim())
        return candidates.filter((c) => {
            if (offerId !== ALL && c.jobOffer?.id !== offerId) return false
            if (q && !normaliseText(`${c.candidateName} ${c.candidateEmail} ${c.candidateTitle ?? ""} ${c.jobOffer?.title ?? ""} ${c.candidateSkills.join(" ")}`).includes(q)) return false
            return true
        })
    }, [candidates, offerId, query])

    const kpis = useMemo(() => {
        const now = Date.now()
        const hired = candidates.filter((c) => c.stage === "HIRED" && c.stageSince)
        const durations = hired
            .filter((c) => c.appliedDate)
            .map((c) => (new Date(c.stageSince!).getTime() - new Date(c.appliedDate!).getTime()) / DAY)
        return {
            active: candidates.filter((c) => ACTIVE_RECRUITMENT_STAGES.includes(c.stage)).length,
            fresh: candidates.filter((c) => c.stage === "NEW").length,
            week: interviews.filter((i) => i.status === "SCHEDULED" && new Date(i.scheduledAt).getTime() >= now && new Date(i.scheduledAt).getTime() <= now + 7 * DAY).length,
            offers: candidates.filter((c) => c.stage === "OFFER").length,
            hired90: hired.filter((c) => now - new Date(c.stageSince!).getTime() <= 90 * DAY).length,
            timeToHire: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
        }
    }, [candidates, interviews])

    const agenda = useMemo(() => {
        const now = Date.now()
        return {
            due: interviews.filter((i) => i.status === "SCHEDULED" && new Date(i.endsAt).getTime() < now),
            upcoming: interviews.filter((i) => i.status === "SCHEDULED" && new Date(i.endsAt).getTime() >= now),
            past: interviews.filter((i) => i.status !== "SCHEDULED").sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
        }
    }, [interviews])

    const hasFilters = offerId !== ALL || query.trim() !== ""

    const openPipelineFor = (id: string) => {
        setOfferId(id)
        setTab("pipeline")
    }

    const filters = (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3 md:flex-row md:items-center">
            <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un candidat, une compétence, un poste..." className="pl-9" aria-label="Rechercher" />
            </div>
            <Select value={offerId} onValueChange={setOfferId}>
                <SelectTrigger className="w-full md:w-[260px]" aria-label="Filtrer par offre"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL}>Toutes les offres</SelectItem>
                    {offers.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.title} ({o.candidatesCount})</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => { setOfferId(ALL); setQuery("") }} className="hover:bg-muted hover:text-foreground">
                    Réinitialiser
                </Button>
            )}
        </div>
    )

    return (
        <div className="space-y-5 pb-8">
            <PageHeader
                title="Recrutements"
                description="Pilotez vos candidatures du premier tri jusqu'à l'embauche : étapes, entretiens et comptes rendus."
                actions={
                    <Button asChild className="gap-1.5 rounded-full px-5">
                        <Link href="/poster-offre">
                            <Send className="h-4 w-4" />
                            Publier une offre
                        </Link>
                    </Button>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard icon={Users} label="Candidats en course" value={kpis.active} hint={`dont ${kpis.fresh} à trier`} highlight={kpis.fresh > 0} onClick={() => setTab("pipeline")} />
                <KpiCard icon={CalendarClock} label="Entretiens sous 7 jours" value={kpis.week} onClick={() => setTab("entretiens")} />
                <KpiCard icon={Handshake} label="Offres à finaliser" value={kpis.offers} hint="candidats à l'étape Offre" highlight={kpis.offers > 0} onClick={() => setTab("liste")} />
                <KpiCard
                    icon={UserCheck}
                    label="Embauches sur 90 jours"
                    value={kpis.hired90}
                    hint={kpis.timeToHire !== null ? `${kpis.timeToHire} j en moyenne de la candidature à l'embauche` : undefined}
                />
            </div>

            {agenda.due.length > 0 && (
                <button
                    type="button"
                    onClick={() => setTab("entretiens")}
                    className="flex w-full items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 transition-colors hover:bg-amber-100"
                >
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    {agenda.due.length} entretien{agenda.due.length > 1 ? "s" : ""} passé{agenda.due.length > 1 ? "s" : ""} sans compte rendu : notez vos impressions tant qu&apos;elles sont fraîches.
                </button>
            )}

            {loading ? (
                <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2" aria-busy="true">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-80 w-72 shrink-0 animate-pulse rounded-xl bg-muted" />)}
                </div>
            ) : loadError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
                    <p>{loadError}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => { setLoading(true); void load().finally(() => setLoading(false)) }}>Réessayer</Button>
                </div>
            ) : offers.length === 0 && candidates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center">
                    <Briefcase className="mx-auto h-9 w-9 text-muted-foreground" />
                    <h2 className="mt-3 text-lg font-semibold text-foreground">Aucune offre publiée</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                        Le pipeline se remplit des candidatures reçues sur vos offres. Publiez une première offre : chaque candidature arrivera ici, à l&apos;étape « Nouveau ».
                    </p>
                    <Button asChild className="mt-5 rounded-full px-5">
                        <Link href="/poster-offre">Publier une offre</Link>
                    </Button>
                </div>
            ) : (
                <Tabs value={tab} onValueChange={setTab}>
                    <div className="overflow-x-auto">
                        <TabsList>
                            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                            <TabsTrigger value="liste">Liste</TabsTrigger>
                            <TabsTrigger value="entretiens">
                                Entretiens
                                {agenda.due.length > 0 && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">{agenda.due.length}</span>}
                            </TabsTrigger>
                            <TabsTrigger value="offres">Offres</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="pipeline" className="mt-4 space-y-3">
                        {filters}
                        {candidates.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">
                                Aucune candidature reçue pour l&apos;instant. Partagez vos offres pour remplir le pipeline.
                            </p>
                        ) : (
                            <>
                                <p className="text-xs text-muted-foreground">Glissez une carte d&apos;une colonne à l&apos;autre, ou utilisez son menu « … ».</p>
                                <RecruitmentBoard candidates={filtered} workflow={workflow} />
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="liste" className="mt-4 space-y-3">
                        {filters}
                        {filtered.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">Aucun candidat ne correspond à ces critères.</p>
                        ) : (
                            <CandidateTable candidates={filtered} workflow={workflow} />
                        )}
                    </TabsContent>

                    <TabsContent value="entretiens" className="mt-4 space-y-6">
                        {agenda.due.length > 0 && (
                            <section>
                                <h2 className="mb-2 text-sm font-semibold text-amber-800">Comptes rendus à rédiger</h2>
                                <InterviewList interviews={agenda.due} workflow={workflow} showCandidate emptyText="" />
                            </section>
                        )}
                        <section>
                            <h2 className="mb-2 text-sm font-semibold text-foreground">À venir</h2>
                            <InterviewList
                                interviews={agenda.upcoming}
                                workflow={workflow}
                                showCandidate
                                emptyText="Aucun entretien planifié. Planifiez-en un depuis la carte ou le dossier d'un candidat."
                            />
                        </section>
                        {agenda.past.length > 0 && (
                            <section>
                                <h2 className="mb-2 text-sm font-semibold text-foreground">Derniers entretiens</h2>
                                <InterviewList interviews={agenda.past.slice(0, 20)} workflow={workflow} showCandidate emptyText="" />
                            </section>
                        )}
                    </TabsContent>

                    <TabsContent value="offres" className="mt-4">
                        {offers.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">Aucune offre publiée.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                {offers.map((offer) => (
                                    <OfferCard key={offer.id} offer={offer} onOpen={() => openPipelineFor(offer.id)} />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            )}

            {workflow.dialogs}
        </div>
    )
}

function CandidateTable({ candidates, workflow }: { candidates: IRecruitmentCandidate[]; workflow: ReturnType<typeof useRecruitmentWorkflow> }) {
    const rank = (stage: RecruitmentStage) => RECRUITMENT_STAGES.indexOf(stage)
    const rows = [...candidates].sort((a, b) => rank(a.stage) - rank(b.stage) || (b.appliedDate ?? "").localeCompare(a.appliedDate ?? ""))

    return (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>Candidat</TableHead>
                        <TableHead className="hidden md:table-cell">Offre</TableHead>
                        <TableHead>Étape</TableHead>
                        <TableHead className="hidden lg:table-cell">Candidature</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">Compatibilité</TableHead>
                        <TableHead className="hidden xl:table-cell">Prochain entretien</TableHead>
                        <TableHead className="w-12 text-right"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((candidate) => {
                        const { firstName, lastName } = splitName(candidate.candidateName)
                        return (
                            <TableRow key={candidate.id}>
                                <TableCell>
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <EmployeeAvatar id={candidate.id} firstName={firstName} lastName={lastName} size="sm" />
                                        <div className="min-w-0">
                                            <Link href={`/services-rh/recrutements/${candidate.id}`} className="block truncate font-medium text-foreground hover:underline">
                                                {candidate.candidateName}
                                            </Link>
                                            <p className="truncate text-xs text-muted-foreground">{candidate.candidateTitle ?? candidate.candidateEmail}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden max-w-[14rem] truncate md:table-cell">{candidate.jobOffer?.title ?? "-"}</TableCell>
                                <TableCell>
                                    <StatusPill meta={RECRUITMENT_STAGE_META[candidate.stage]} />
                                    {candidate.feedbackDueCount > 0 && <p className="mt-1 text-[11px] text-amber-700">Compte rendu à rédiger</p>}
                                </TableCell>
                                <TableCell className="hidden whitespace-nowrap lg:table-cell">{formatDate(candidate.appliedDate)}</TableCell>
                                <TableCell className="hidden text-right tabular-nums sm:table-cell">{candidate.score > 0 ? `${candidate.score} %` : "-"}</TableCell>
                                <TableCell className="hidden whitespace-nowrap xl:table-cell">{candidate.nextInterview ? formatDateTime(candidate.nextInterview.scheduledAt) : "-"}</TableCell>
                                <TableCell className="text-right">
                                    <CandidateActionsMenu candidate={candidate} workflow={workflow} />
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}

function OfferCard({ offer, onOpen }: { offer: IRecruitmentJobOffer; onOpen: () => void }) {
    const status = offer.status ? JOB_STATUS_META[offer.status] : null
    const active = ACTIVE_RECRUITMENT_STAGES.reduce((sum, stage) => sum + offer.stages[stage], 0)

    return (
        <article className="flex flex-col rounded-xl border border-border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="truncate font-semibold text-foreground">{offer.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {[jobTypeLabel(offer.type), offer.location, offer.endDate ? `jusqu'au ${formatDate(offer.endDate)}` : null].filter(Boolean).join(" · ") || "-"}
                    </p>
                </div>
                {status && <StatusPill meta={status} />}
            </div>

            <p className="mt-3 text-sm text-foreground">
                <span className="text-2xl font-semibold tabular-nums">{offer.candidatesCount}</span> candidature{offer.candidatesCount > 1 ? "s" : ""}
                <span className="text-muted-foreground"> · {active} en course · {offer.stages.HIRED} embauche{offer.stages.HIRED > 1 ? "s" : ""}</span>
            </p>

            {offer.candidatesCount > 0 && (
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    {RECRUITMENT_STAGES.map((stage) =>
                        offer.stages[stage] > 0 ? (
                            <span key={stage} className={RECRUITMENT_STAGE_META[stage].dot} style={{ width: `${(offer.stages[stage] / offer.candidatesCount) * 100}%` }} />
                        ) : null,
                    )}
                </div>
            )}
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {RECRUITMENT_STAGES.map((stage) => (
                    <li key={stage} className="inline-flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${RECRUITMENT_STAGE_META[stage].dot}`} />
                        {RECRUITMENT_STAGE_META[stage].label} {offer.stages[stage]}
                    </li>
                ))}
            </ul>

            <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <Button size="sm" onClick={onOpen} disabled={offer.candidatesCount === 0}>Ouvrir le pipeline</Button>
                <Button size="sm" variant="outline" asChild className="hover:bg-muted hover:text-foreground">
                    <Link href="/annonces">Gérer l&apos;annonce</Link>
                </Button>
            </div>
        </article>
    )
}
