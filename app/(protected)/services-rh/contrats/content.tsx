"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
    CalendarClock,
    ChevronLeft,
    ChevronRight,
    CircleCheckBig,
    FilePlus2,
    FileSignature,
    FileWarning,
    Hourglass,
    Search,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ContractActionsMenu, useContractWorkflow } from "@/components/rh/contract-actions"
import { ContractAlertList } from "@/components/rh/contract-alerts"
import { EmployeeAvatar } from "@/components/rh/employee-avatar"
import { KpiCard } from "@/components/rh/kpi-card"
import { StatusPill } from "@/components/rh/status-pill"
import {
    CONTRACT_KIND_META,
    CONTRACT_STATUS_META,
    CONTRACT_TYPES,
    contractAlerts,
    contractTypeLabel,
    formatDate,
    formatFcfa,
    normaliseText,
} from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { contractService, type ContractStatus, type IEmployeeContract } from "@/lib/api/contract.service"
import { employeeService, type IEmployee } from "@/lib/api/employee.service"

const ALL = "all"
const PAGE_SIZE = 15

/** Les contrats en vigueur d'abord, puis les brouillons, puis l'historique. */
const STATUS_RANK: Record<ContractStatus, number> = { ACTIVE: 0, DRAFT: 1, ENDED: 2, TERMINATED: 3 }

/**
 * Page Contrats : tous les contrats de l'entreprise et les échéances à traiter.
 * Les opérations passent par useContractWorkflow, comme sur la fiche employé.
 */
export function ContratsContent() {
    const [contracts, setContracts] = useState<IEmployeeContract[]>([])
    const [employees, setEmployees] = useState<IEmployee[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [tab, setTab] = useState("contrats")
    const [query, setQuery] = useState("")
    const [status, setStatus] = useState<string>(ALL)
    const [type, setType] = useState<string>(ALL)
    const [page, setPage] = useState(1)

    const load = useCallback(async () => {
        try {
            const [contractList, employeeList] = await Promise.all([contractService.companyContracts(), employeeService.list()])
            setContracts(contractList)
            setEmployees(employeeList)
            setLoadError(null)
        } catch (err) {
            setLoadError(extractApiErrorMessage(err, "Impossible de charger les contrats."))
        }
    }, [])

    useEffect(() => {
        void load().finally(() => setLoading(false))
    }, [load])

    const workflow = useContractWorkflow({ onChanged: load, employees, contracts })
    const alerts = useMemo(() => contractAlerts(contracts, employees), [contracts, employees])

    const kpis = useMemo(
        () => ({
            active: contracts.filter((c) => c.status === "ACTIVE").length,
            deadlines: alerts.filter((a) => a.kind === "EXPIRED" || a.kind === "ENDING_SOON").length,
            trials: alerts.filter((a) => a.kind === "TRIAL_ENDING").length,
            toFix: alerts.filter((a) => a.kind === "UNSIGNED" || a.kind === "NO_CONTRACT").length,
        }),
        [contracts, alerts],
    )

    const filtered = useMemo(() => {
        const q = normaliseText(query.trim())
        return contracts
            .filter((c) => {
                if (status !== ALL && c.status !== status) return false
                if (type !== ALL && c.type !== type) return false
                if (q && !normaliseText(`${c.reference} ${c.employee?.fullName ?? ""} ${c.employee?.matricule ?? ""} ${c.jobTitle}`).includes(q)) return false
                return true
            })
            .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.startDate.localeCompare(a.startDate))
    }, [contracts, query, status, type])

    useEffect(() => {
        setPage(1)
    }, [query, status, type])

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const currentPage = Math.min(page, pageCount)
    const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    const hasFilters = query.trim() !== "" || status !== ALL || type !== ALL
    const presentEmployees = employees.filter((e) => e.status !== "TERMINATED")

    return (
        <div className="space-y-5 pb-8">
            <PageHeader
                title="Contrats"
                description="Les contrats de vos employés : historique, signatures, renouvellements et échéances."
                actions={
                    <Button onClick={() => workflow.openCreate()} disabled={!loading && presentEmployees.length === 0} className="gap-1.5 rounded-full px-5">
                        <FilePlus2 className="h-4 w-4" />
                        Nouveau contrat
                    </Button>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard icon={CircleCheckBig} label="Contrats en vigueur" value={kpis.active} />
                <KpiCard icon={CalendarClock} label="Échéances sous 30 jours" value={kpis.deadlines} highlight={kpis.deadlines > 0} onClick={() => setTab("echeances")} />
                <KpiCard icon={Hourglass} label="Fins d'essai sous 15 jours" value={kpis.trials} highlight={kpis.trials > 0} onClick={() => setTab("echeances")} />
                <KpiCard icon={FileWarning} label="À régulariser" value={kpis.toFix} hint="non signés ou sans contrat" highlight={kpis.toFix > 0} onClick={() => setTab("echeances")} />
            </div>

            {!loading && !loadError && employees.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center">
                    <FileSignature className="mx-auto h-9 w-9 text-muted-foreground" />
                    <h2 className="mt-3 text-lg font-semibold text-foreground">Commencez par vos employés</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                        Chaque employé ajouté reçoit son contrat initial, repris de sa fiche. Ajoutez-les, puis revenez ici.
                    </p>
                    <Button asChild className="mt-5 rounded-full px-5">
                        <Link href="/services-rh/employes">Aller aux employés</Link>
                    </Button>
                </div>
            ) : (
                <Tabs value={tab} onValueChange={setTab}>
                    <div className="overflow-x-auto">
                        <TabsList>
                            <TabsTrigger value="contrats">Contrats</TabsTrigger>
                            <TabsTrigger value="echeances">
                                Échéances
                                {alerts.length > 0 && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">{alerts.length}</span>}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="contrats" className="mt-4 space-y-3">
                        <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3 lg:flex-row lg:items-center">
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une référence, un employé, un poste..." className="pl-9" aria-label="Rechercher" />
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="w-full lg:w-[170px]" aria-label="Filtrer par statut"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>Tous les statuts</SelectItem>
                                        {(Object.keys(CONTRACT_STATUS_META) as ContractStatus[]).map((s) => (
                                            <SelectItem key={s} value={s}>{CONTRACT_STATUS_META[s].label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger className="w-full lg:w-[170px]" aria-label="Filtrer par type"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>Tous les types</SelectItem>
                                        {CONTRACT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
                                {contracts.length === 0 ? "Aucun contrat enregistré." : "Aucun contrat ne correspond à ces critères."}
                                {hasFilters && (
                                    <div className="mt-3">
                                        <Button variant="outline" size="sm" onClick={() => { setQuery(""); setStatus(ALL); setType(ALL) }}>
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
                                            <TableHead>Contrat</TableHead>
                                            <TableHead>Employé</TableHead>
                                            <TableHead className="hidden md:table-cell">Type et poste</TableHead>
                                            <TableHead className="hidden sm:table-cell">Période</TableHead>
                                            <TableHead className="hidden text-right lg:table-cell">Salaire brut</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead className="w-12 text-right"><span className="sr-only">Actions</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pageRows.map((contract) => (
                                            <TableRow key={contract.id}>
                                                <TableCell>
                                                    <p className="font-medium text-foreground">{contract.reference}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {CONTRACT_KIND_META[contract.kind].label}
                                                        {contract.parent ? ` · ${contract.parent.reference}` : ""}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex min-w-0 items-center gap-2.5">
                                                        {contract.employee && (
                                                            <EmployeeAvatar id={contract.employee.id} firstName={contract.employee.firstName} lastName={contract.employee.lastName} size="sm" />
                                                        )}
                                                        <div className="min-w-0">
                                                            {contract.employee ? (
                                                                <Link href={`/services-rh/employes/${contract.employee.id}`} className="block truncate font-medium text-foreground hover:underline">
                                                                    {contract.employee.fullName}
                                                                </Link>
                                                            ) : (
                                                                <span className="text-muted-foreground">Employé</span>
                                                            )}
                                                            <p className="truncate text-xs text-muted-foreground md:hidden">{contractTypeLabel(contract.type)}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <p className="text-foreground">{contractTypeLabel(contract.type)}</p>
                                                    <p className="max-w-[14rem] truncate text-xs text-muted-foreground">{contract.jobTitle}</p>
                                                </TableCell>
                                                <TableCell className="hidden whitespace-nowrap sm:table-cell">
                                                    {formatDate(contract.startDate)} → {contract.endDate ? formatDate(contract.endDate) : "indéterminée"}
                                                </TableCell>
                                                <TableCell className="hidden text-right tabular-nums lg:table-cell">{formatFcfa(contract.salary)}</TableCell>
                                                <TableCell>
                                                    <StatusPill meta={CONTRACT_STATUS_META[contract.status]} />
                                                    {contract.status === "ACTIVE" && !contract.signedAt && !contract.document && (
                                                        <p className="mt-1 text-[11px] text-amber-700">Non signé</p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <ContractActionsMenu contract={contract} workflow={workflow} />
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
                                    {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} sur {filtered.length} contrats
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

                    <TabsContent value="echeances" className="mt-4">
                        {loading ? (
                            <div className="h-40 animate-pulse rounded-xl bg-muted" aria-busy="true" />
                        ) : alerts.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center">
                                <CircleCheckBig className="mx-auto h-8 w-8 text-green-600" />
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Rien à traiter : aucun contrat échu ni proche de son terme, tous sont signés et chaque employé présent en a un.
                                </p>
                            </div>
                        ) : (
                            <ContractAlertList alerts={alerts} workflow={workflow} showEmployee />
                        )}
                    </TabsContent>
                </Tabs>
            )}

            {workflow.dialogs}
        </div>
    )
}
