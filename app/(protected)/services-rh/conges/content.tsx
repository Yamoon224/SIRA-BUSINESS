"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
    CalendarCheck,
    CalendarClock,
    CalendarDays,
    CalendarPlus,
    ChevronLeft,
    ChevronRight,
    Hourglass,
    Search,
    Trash2,
    UserX,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmployeeAvatar } from "@/components/rh/employee-avatar"
import { KpiCard as Kpi } from "@/components/rh/kpi-card"
import { LeaveActionButtons, useLeaveWorkflow } from "@/components/rh/leave-actions"
import { LeaveBalancesTable } from "@/components/rh/leave-balances-table"
import { LeaveDialog } from "@/components/rh/leave-dialog"
import { LeavePlanning } from "@/components/rh/leave-planning"
import { StatusPill } from "@/components/rh/status-pill"
import { LEAVE_TYPE_META, WORKFLOW_STATUS_META, addDaysIso, formatDate, normaliseText, todayIso } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import {
    employeeService,
    type HrWorkflowStatus,
    type IEmployee,
    type IEmployeeLeave,
    type ILeaveBalance,
    type ILeaveBalanceRow,
    type LeaveType,
} from "@/lib/api/employee.service"
import { cn } from "@/lib/utils"

const ALL = "all"
const PAGE_SIZE = 15

/** Les congés à valider remontent en tête, puis les plus récents. */
const STATUS_RANK: Record<HrWorkflowStatus, number> = { PENDING: 0, IN_PROGRESS: 1, APPROVED: 2, REJECTED: 3, CANCELLED: 4 }

type Period = "all" | "current" | "year" | "lastYear"

/**
 * Page Congés : vue d'ensemble des absences de l'entreprise. Les décisions
 * passent par les mêmes composants que la fiche employé (useLeaveWorkflow) :
 * mêmes règles, mêmes messages, d'où que l'on approuve.
 */
export function CongesContent() {
    const currentYear = new Date().getFullYear()

    const [leaves, setLeaves] = useState<IEmployeeLeave[]>([])
    const [employees, setEmployees] = useState<IEmployee[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [balanceYear, setBalanceYear] = useState(currentYear)
    const [balances, setBalances] = useState<ILeaveBalanceRow[] | null>(null)
    const [balancesLoading, setBalancesLoading] = useState(true)
    const [balancesError, setBalancesError] = useState<string | null>(null)

    const [tab, setTab] = useState("demandes")
    const [create, setCreate] = useState<{ open: boolean; employeeId: string | null }>({ open: false, employeeId: null })

    const [query, setQuery] = useState("")
    const [status, setStatus] = useState<string>(ALL)
    const [type, setType] = useState<string>(ALL)
    const [period, setPeriod] = useState<Period>("all")
    const [page, setPage] = useState(1)
    const [selected, setSelected] = useState<Set<string>>(new Set())

    const loadLeaves = useCallback(async () => {
        try {
            setLeaves(await employeeService.companyLeaves())
            setLoadError(null)
        } catch (err) {
            setLoadError(extractApiErrorMessage(err, "Impossible de charger les congés."))
        }
    }, [])

    const loadBalances = useCallback(async (year: number) => {
        setBalancesLoading(true)
        try {
            setBalances(await employeeService.leaveBalances(year))
            setBalancesError(null)
        } catch (err) {
            setBalancesError(extractApiErrorMessage(err, "Impossible de charger les soldes de congés."))
        } finally {
            setBalancesLoading(false)
        }
    }, [])

    useEffect(() => {
        setLoading(true)
        void Promise.all([
            loadLeaves(),
            employeeService.list().then(setEmployees).catch(() => setEmployees([])),
        ]).finally(() => setLoading(false))
    }, [loadLeaves])

    useEffect(() => {
        void loadBalances(balanceYear)
    }, [balanceYear, loadBalances])

    /** Après une décision ou un nouveau congé : liste et soldes se recalculent. */
    const refresh = useCallback(async () => {
        await Promise.all([loadLeaves(), loadBalances(balanceYear)])
    }, [loadLeaves, loadBalances, balanceYear])

    const { requestDecision, requestDelete, requestBulkDelete, dialogs } = useLeaveWorkflow(refresh, () => setSelected(new Set()))

    const kpis = useMemo(() => {
        const today = todayIso()
        const in30Days = addDaysIso(today, 30)
        const year = String(currentYear)
        return {
            pending: leaves.filter((l) => l.status === "PENDING").length,
            absentToday: new Set(leaves.filter((l) => l.status === "APPROVED" && l.startDate <= today && l.endDate >= today).map((l) => l.employeeId)).size,
            upcoming: leaves.filter((l) => (l.status === "APPROVED" || l.status === "PENDING") && l.startDate > today && l.startDate <= in30Days).length,
            approvedDays: leaves.filter((l) => l.status === "APPROVED" && l.startDate.startsWith(year)).reduce((sum, l) => sum + l.days, 0),
        }
    }, [leaves, currentYear])

    const filtered = useMemo(() => {
        const q = normaliseText(query.trim())
        const today = todayIso()
        const inYear = (l: IEmployeeLeave, y: number) => l.startDate.startsWith(String(y)) || l.endDate.startsWith(String(y))
        return leaves
            .filter((l) => {
                if (status !== ALL && l.status !== status) return false
                if (type !== ALL && l.type !== type) return false
                if (period === "current" && l.endDate < today) return false
                if (period === "year" && !inYear(l, currentYear)) return false
                if (period === "lastYear" && !inYear(l, currentYear - 1)) return false
                if (q && !normaliseText(`${l.employee?.fullName ?? ""} ${l.employee?.matricule ?? ""} ${l.employee?.department ?? ""}`).includes(q)) return false
                return true
            })
            .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.startDate.localeCompare(a.startDate))
    }, [leaves, query, status, type, period, currentYear])

    useEffect(() => {
        setPage(1)
        setSelected(new Set())
    }, [query, status, type, period])

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const currentPage = Math.min(page, pageCount)
    const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    const hasFilters = query.trim() !== "" || status !== ALL || type !== ALL || period !== "all"

    // Les soldes ne valent que pour l'année affichée : on ne les passe à la
    // modale que s'il s'agit de l'année en cours, celle des congés que l'on pose.
    const balanceMap = useMemo<Record<string, ILeaveBalance> | undefined>(() => {
        if (!balances || balanceYear !== currentYear) return undefined
        return Object.fromEntries(balances.map(({ employee, ...balance }) => [employee.id, balance]))
    }, [balances, balanceYear, currentYear])

    const presentEmployees = employees.filter((e) => e.status !== "TERMINATED")

    const allPageSelected = pageRows.length > 0 && pageRows.every((l) => selected.has(l.id))
    const togglePage = (checked: boolean) => {
        setSelected((prev) => {
            const next = new Set(prev)
            for (const l of pageRows) checked ? next.add(l.id) : next.delete(l.id)
            return next
        })
    }
    const toggleOne = (id: string, checked: boolean) => {
        setSelected((prev) => {
            const next = new Set(prev)
            checked ? next.add(id) : next.delete(id)
            return next
        })
    }

    return (
        <div className="space-y-5 pb-8">
            <PageHeader
                title="Congés"
                description="Les absences de toute l'entreprise : demandes à valider, planning du mois et soldes de chacun."
                actions={
                    <Button onClick={() => setCreate({ open: true, employeeId: null })} disabled={!loading && presentEmployees.length === 0} className="gap-1.5 rounded-full px-5">
                        <CalendarPlus className="h-4 w-4" />
                        Poser un congé
                    </Button>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi icon={Hourglass} label="À valider" value={kpis.pending} highlight={kpis.pending > 0} onClick={kpis.pending > 0 ? () => { setTab("demandes"); setStatus("PENDING") } : undefined} />
                <Kpi icon={UserX} label="Absents aujourd'hui" value={kpis.absentToday} />
                <Kpi icon={CalendarClock} label="Départs sous 30 jours" value={kpis.upcoming} onClick={() => setTab("planning")} />
                <Kpi icon={CalendarCheck} label={`Jours approuvés ${currentYear}`} value={kpis.approvedDays} />
            </div>

            {!loading && employees.length === 0 && !loadError ? (
                <div className="rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center">
                    <CalendarDays className="mx-auto h-9 w-9 text-muted-foreground" />
                    <h2 className="mt-3 text-lg font-semibold text-foreground">Commencez par vos employés</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                        Les congés se posent pour les collaborateurs de votre répertoire. Ajoutez-les, puis revenez ici.
                    </p>
                    <Button asChild className="mt-5 rounded-full px-5">
                        <Link href="/services-rh/employes">Aller aux employés</Link>
                    </Button>
                </div>
            ) : (
                <Tabs value={tab} onValueChange={setTab}>
                    <div className="overflow-x-auto">
                        <TabsList>
                            <TabsTrigger value="demandes">
                                Demandes
                                {kpis.pending > 0 && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">{kpis.pending}</span>}
                            </TabsTrigger>
                            <TabsTrigger value="planning">Planning</TabsTrigger>
                            <TabsTrigger value="soldes">Soldes</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="demandes" className="mt-4 space-y-3">
                        <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3 lg:flex-row lg:items-center">
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un employé, un matricule, un département..." className="pl-9" aria-label="Rechercher" />
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="w-full lg:w-[160px]" aria-label="Filtrer par statut"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>Tous les statuts</SelectItem>
                                        {(["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as HrWorkflowStatus[]).map((s) => (
                                            <SelectItem key={s} value={s}>{WORKFLOW_STATUS_META[s].label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger className="w-full lg:w-[170px]" aria-label="Filtrer par type"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>Tous les types</SelectItem>
                                        {(Object.keys(LEAVE_TYPE_META) as LeaveType[]).map((t) => (
                                            <SelectItem key={t} value={t}>{LEAVE_TYPE_META[t].label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                                    <SelectTrigger className="w-full lg:w-[170px]" aria-label="Filtrer par période"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Toutes les dates</SelectItem>
                                        <SelectItem value="current">En cours et à venir</SelectItem>
                                        <SelectItem value="year">Année {currentYear}</SelectItem>
                                        <SelectItem value="lastYear">Année {currentYear - 1}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {selected.size > 0 && (
                            <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
                                <span className="text-sm font-medium text-red-700">
                                    {selected.size} congé{selected.size > 1 ? "s" : ""} sélectionné{selected.size > 1 ? "s" : ""}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                                        Annuler
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700"
                                        onClick={() => requestBulkDelete(Array.from(selected))}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Supprimer
                                    </Button>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="space-y-2 rounded-xl border border-border bg-white p-3" aria-busy="true">
                                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}
                            </div>
                        ) : loadError ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
                                <p>{loadError}</p>
                                <Button variant="outline" size="sm" className="mt-3" onClick={() => { setLoading(true); void loadLeaves().finally(() => setLoading(false)) }}>
                                    Réessayer
                                </Button>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">
                                {leaves.length === 0 ? "Aucun congé n'a encore été posé." : status === "PENDING" && !hasFilters ? "Aucun congé en attente de validation." : "Aucun congé ne correspond à ces critères."}
                                {hasFilters && (
                                    <div className="mt-3">
                                        <Button variant="outline" size="sm" onClick={() => { setQuery(""); setStatus(ALL); setType(ALL); setPeriod("all") }}>
                                            Réinitialiser les filtres
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-xl border border-border bg-white">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                                            <TableHead className="w-10">
                                                <Checkbox
                                                    checked={allPageSelected}
                                                    onCheckedChange={(v) => togglePage(v === true)}
                                                    aria-label="Tout sélectionner"
                                                />
                                            </TableHead>
                                            <TableHead>Employé</TableHead>
                                            <TableHead className="hidden md:table-cell">Type</TableHead>
                                            <TableHead>Période</TableHead>
                                            <TableHead className="hidden text-right sm:table-cell">Jours</TableHead>
                                            <TableHead className="hidden lg:table-cell">Statut</TableHead>
                                            <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pageRows.map((leave) => (
                                            <TableRow key={leave.id} className={cn(leave.status === "PENDING" && "bg-amber-50/40")}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selected.has(leave.id)}
                                                        onCheckedChange={(v) => toggleOne(leave.id, v === true)}
                                                        aria-label="Sélectionner ce congé"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        {leave.employee && (
                                                            <EmployeeAvatar id={leave.employee.id} firstName={leave.employee.firstName} lastName={leave.employee.lastName} size="sm" />
                                                        )}
                                                        <div className="min-w-0">
                                                            {leave.employee ? (
                                                                <Link href={`/services-rh/employes/${leave.employee.id}`} className="block truncate font-medium text-foreground hover:underline">
                                                                    {leave.employee.fullName}
                                                                </Link>
                                                            ) : (
                                                                <span className="block truncate text-muted-foreground">Employé</span>
                                                            )}
                                                            <p className="truncate text-xs text-muted-foreground md:hidden">{LEAVE_TYPE_META[leave.type]?.label}</p>
                                                            <p className="hidden truncate text-xs text-muted-foreground md:block">{leave.employee?.jobTitle}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                                                        <span className={cn("h-2.5 w-2.5 rounded-full", LEAVE_TYPE_META[leave.type]?.color)} aria-hidden="true" />
                                                        {LEAVE_TYPE_META[leave.type]?.label ?? leave.type}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="whitespace-nowrap text-foreground">{formatDate(leave.startDate)} → {formatDate(leave.endDate)}</p>
                                                    {leave.reason && <p className="max-w-[16rem] truncate text-xs text-muted-foreground" title={leave.reason}>{leave.reason}</p>}
                                                    <div className="mt-1 lg:hidden"><StatusPill meta={WORKFLOW_STATUS_META[leave.status]} /></div>
                                                </TableCell>
                                                <TableCell className="hidden text-right tabular-nums sm:table-cell">{leave.days} j</TableCell>
                                                <TableCell className="hidden lg:table-cell">
                                                    <StatusPill meta={WORKFLOW_STATUS_META[leave.status]} />
                                                    {leave.decidedByName && <p className="mt-1 text-[11px] text-muted-foreground">par {leave.decidedByName}</p>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <LeaveActionButtons leave={leave} onDecide={requestDecision} onDelete={requestDelete} compact />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {!loading && !loadError && filtered.length > PAGE_SIZE && (
                            <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
                                <span>
                                    {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} sur {filtered.length} congés
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                                        <ChevronLeft className="h-4 w-4" />
                                        Précédent
                                    </Button>
                                    <span className="tabular-nums">{currentPage} / {pageCount}</span>
                                    <Button variant="outline" size="sm" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
                                        Suivant
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="planning" className="mt-4">
                        {loading ? <div className="h-72 animate-pulse rounded-xl bg-muted" aria-busy="true" /> : <LeavePlanning leaves={leaves} />}
                    </TabsContent>

                    <TabsContent value="soldes" className="mt-4">
                        <LeaveBalancesTable
                            rows={balances}
                            loading={balancesLoading}
                            error={balancesError}
                            year={balanceYear}
                            years={[currentYear, currentYear - 1, currentYear - 2]}
                            onYearChange={setBalanceYear}
                            onRetry={() => void loadBalances(balanceYear)}
                            onPlanLeave={balanceYear === currentYear ? (employeeId) => setCreate({ open: true, employeeId }) : undefined}
                        />
                    </TabsContent>
                </Tabs>
            )}

            <LeaveDialog
                open={create.open}
                onOpenChange={(open) => setCreate((prev) => ({ ...prev, open }))}
                employees={employees}
                defaultEmployeeId={create.employeeId}
                balances={balanceMap}
                onCreated={() => void refresh()}
            />
            {dialogs}
        </div>
    )
}
