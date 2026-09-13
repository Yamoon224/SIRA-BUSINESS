"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ClipboardList, Hourglass, PlayCircle, Search, Trash2, Wallet } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmployeeAvatar } from "@/components/rh/employee-avatar"
import { KpiCard as Kpi } from "@/components/rh/kpi-card"
import { StatusPill } from "@/components/rh/status-pill"
import { ConfirmDialog } from "@/components/rh/confirm-dialog"
import { DecisionDialog } from "@/components/rh/decision-dialog"
import { HR_REQUEST_TYPE_META, WORKFLOW_STATUS_META, formatDate, normaliseText } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { employeeService, type HrRequestType, type HrWorkflowStatus, type IEmployee, type IHrRequest } from "@/lib/api/employee.service"
import { toast } from "sonner"

const ALL = "all"

/** À traiter en tête, puis les plus récentes. */
const STATUS_RANK: Record<HrWorkflowStatus, number> = { PENDING: 0, IN_PROGRESS: 1, APPROVED: 2, REJECTED: 3, CANCELLED: 4 }

const DECISION_COPY: Partial<Record<HrWorkflowStatus, { title: string; confirm: string; tone: "approve" | "reject" | "neutral"; done: string }>> = {
    APPROVED: { title: "Approuver cette demande ?", confirm: "Approuver", tone: "approve", done: "Demande approuvée." },
    REJECTED: { title: "Refuser cette demande ?", confirm: "Refuser", tone: "reject", done: "Demande refusée." },
    CANCELLED: { title: "Annuler cette demande ?", confirm: "Annuler la demande", tone: "neutral", done: "Demande annulée." },
}

/**
 * Page Demandes RH : vue d'ensemble des demandes (attestations, avances,
 * formations…) de toute l'entreprise - jusqu'ici une demande n'était visible
 * que depuis la fiche de son employé, sans liste centralisée pour les RH.
 */
export default function DemandesPage() {
    const [requests, setRequests] = useState<IHrRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [query, setQuery] = useState("")
    const [status, setStatus] = useState<string>(ALL)
    const [type, setType] = useState<string>(ALL)

    const [decision, setDecision] = useState<{ request: IHrRequest; status: HrWorkflowStatus } | null>(null)
    const [deciding, setDeciding] = useState(false)
    const [startingId, setStartingId] = useState<string | null>(null)
    const [toDelete, setToDelete] = useState<IHrRequest | null>(null)
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        try {
            setRequests(await employeeService.companyRequests())
            setLoadError(null)
        } catch (err) {
            setLoadError(extractApiErrorMessage(err, "Impossible de charger les demandes RH."))
        }
    }, [])

    useEffect(() => {
        setLoading(true)
        void load().finally(() => setLoading(false))
    }, [load])

    const kpis = useMemo(() => ({
        pending: requests.filter((r) => r.status === "PENDING").length,
        inProgress: requests.filter((r) => r.status === "IN_PROGRESS").length,
        advances: requests.filter((r) => r.type === "SALARY_ADVANCE" && r.status === "PENDING").length,
    }), [requests])

    const filtered = useMemo(() => {
        const q = normaliseText(query.trim())
        return requests
            .filter((r) => {
                if (status !== ALL && r.status !== status) return false
                if (type !== ALL && r.type !== type) return false
                if (q && !normaliseText(`${r.employee?.fullName ?? ""} ${r.subject} ${r.employee?.department ?? ""}`).includes(q)) return false
                return true
            })
            .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.createdAt.localeCompare(a.createdAt))
    }, [requests, query, status, type])

    const hasFilters = query.trim() !== "" || status !== ALL || type !== ALL

    const start = async (request: IHrRequest) => {
        setStartingId(request.id)
        try {
            await employeeService.decideRequest(request.id, "IN_PROGRESS")
            toast.success("Demande prise en charge.")
            await load()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La prise en charge a échoué."))
        } finally {
            setStartingId(null)
        }
    }

    const decide = async (comment: string | null) => {
        if (!decision) return
        setDeciding(true)
        try {
            await employeeService.decideRequest(decision.request.id, decision.status, comment)
            toast.success(DECISION_COPY[decision.status]?.done ?? "Demande mise à jour.")
            setDecision(null)
            await load()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La décision n'a pas pu être enregistrée."))
        } finally {
            setDeciding(false)
        }
    }

    const remove = async () => {
        if (!toDelete) return
        setDeleting(true)
        try {
            await employeeService.removeRequest(toDelete.id)
            toast.success("Demande supprimée.")
            setToDelete(null)
            await load()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La suppression a échoué."))
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-5 pb-8">
            <PageHeader
                title="Demandes RH"
                description="Attestations, avances, formations… les demandes reçues sur l'ensemble de vos employés."
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Kpi icon={Hourglass} label="En attente" value={kpis.pending} highlight={kpis.pending > 0} onClick={kpis.pending > 0 ? () => setStatus("PENDING") : undefined} />
                <Kpi icon={PlayCircle} label="En cours" value={kpis.inProgress} onClick={() => setStatus("IN_PROGRESS")} />
                <Kpi icon={Wallet} label="Avances à traiter" value={kpis.advances} highlight={kpis.advances > 0} onClick={kpis.advances > 0 ? () => setType("SALARY_ADVANCE") : undefined} />
            </div>

            {!loading && requests.length === 0 && !loadError ? (
                <div className="rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center">
                    <ClipboardList className="mx-auto h-9 w-9 text-muted-foreground" />
                    <h2 className="mt-3 text-lg font-semibold text-foreground">Aucune demande pour le moment</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                        Les demandes RH (attestations, avances, formations…) posées par vos employés apparaîtront ici.
                    </p>
                    <Button asChild className="mt-5 rounded-full px-5">
                        <Link href="/services-rh/employes">Aller aux employés</Link>
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3 lg:flex-row lg:items-center">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un employé, un objet, un département..." className="pl-9" aria-label="Rechercher" />
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="w-full lg:w-[170px]" aria-label="Filtrer par statut"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>Tous les statuts</SelectItem>
                                    {(["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED", "CANCELLED"] as HrWorkflowStatus[]).map((s) => (
                                        <SelectItem key={s} value={s}>{WORKFLOW_STATUS_META[s].label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="w-full lg:w-[190px]" aria-label="Filtrer par type"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>Tous les types</SelectItem>
                                    {(Object.keys(HR_REQUEST_TYPE_META) as HrRequestType[]).map((t) => (
                                        <SelectItem key={t} value={t}>{HR_REQUEST_TYPE_META[t].label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-2 rounded-xl border border-border bg-white p-3" aria-busy="true">
                            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}
                        </div>
                    ) : loadError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
                            <p>{loadError}</p>
                            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setLoading(true); void load().finally(() => setLoading(false)) }}>
                                Réessayer
                            </Button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">
                            Aucune demande ne correspond à ces critères.
                            {hasFilters && (
                                <div className="mt-3">
                                    <Button variant="outline" size="sm" onClick={() => { setQuery(""); setStatus(ALL); setType(ALL) }}>
                                        Réinitialiser les filtres
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-border bg-white">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                                        <TableHead>Employé</TableHead>
                                        <TableHead className="hidden md:table-cell">Type</TableHead>
                                        <TableHead>Objet</TableHead>
                                        <TableHead className="hidden text-right sm:table-cell">Montant</TableHead>
                                        <TableHead className="hidden lg:table-cell">Statut</TableHead>
                                        <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((r) => (
                                        <TableRow key={r.id} className={r.status === "PENDING" ? "bg-amber-50/40" : undefined}>
                                            <TableCell>
                                                <div className="flex min-w-0 items-center gap-3">
                                                    {r.employee && <EmployeeAvatar id={r.employee.id} firstName={r.employee.firstName} lastName={r.employee.lastName} size="sm" />}
                                                    <div className="min-w-0">
                                                        {r.employee ? (
                                                            <Link href={`/services-rh/employes/${r.employee.id}`} className="block truncate font-medium text-foreground hover:underline">
                                                                {r.employee.fullName}
                                                            </Link>
                                                        ) : (
                                                            <span className="block truncate text-muted-foreground">Employé</span>
                                                        )}
                                                        <p className="truncate text-xs text-muted-foreground md:hidden">{HR_REQUEST_TYPE_META[r.type]?.label}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell whitespace-nowrap">{HR_REQUEST_TYPE_META[r.type]?.label ?? r.type}</TableCell>
                                            <TableCell>
                                                <p className="max-w-[16rem] truncate text-foreground" title={r.subject}>{r.subject}</p>
                                                <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                                                <div className="mt-1 lg:hidden"><StatusPill meta={WORKFLOW_STATUS_META[r.status]} /></div>
                                            </TableCell>
                                            <TableCell className="hidden text-right tabular-nums sm:table-cell">{r.amount ? `${r.amount.toLocaleString("fr-FR")} F` : "-"}</TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <StatusPill meta={WORKFLOW_STATUS_META[r.status]} />
                                                {r.decidedByName && <p className="mt-1 text-[11px] text-muted-foreground">par {r.decidedByName}</p>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    {r.status === "PENDING" && (
                                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={startingId === r.id} onClick={() => start(r)}>
                                                            Prendre en charge
                                                        </Button>
                                                    )}
                                                    {(r.status === "PENDING" || r.status === "IN_PROGRESS") && (
                                                        <>
                                                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600 hover:bg-green-50 hover:text-green-600" onClick={() => setDecision({ request: r, status: "APPROVED" })}>
                                                                Approuver
                                                            </Button>
                                                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-500" onClick={() => setDecision({ request: r, status: "REJECTED" })}>
                                                                Refuser
                                                            </Button>
                                                        </>
                                                    )}
                                                    {r.status !== "APPROVED" && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => setToDelete(r)} title="Supprimer">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            )}

            <DecisionDialog
                open={!!decision}
                onOpenChange={(open) => !open && setDecision(null)}
                title={decision ? DECISION_COPY[decision.status]?.title ?? "" : ""}
                description={decision ? `Concerne la demande de ${decision.request.employee?.fullName ?? "l'employé"}.` : undefined}
                confirmLabel={decision ? DECISION_COPY[decision.status]?.confirm ?? "Confirmer" : "Confirmer"}
                tone={decision ? DECISION_COPY[decision.status]?.tone : "neutral"}
                commentRequired={decision?.status === "REJECTED"}
                loading={deciding}
                onConfirm={decide}
            />

            <ConfirmDialog
                open={!!toDelete}
                onOpenChange={(open) => !open && setToDelete(null)}
                title="Supprimer cette demande ?"
                description="Cette action est irréversible."
                destructive
                loading={deleting}
                onConfirm={remove}
            />
        </div>
    )
}
