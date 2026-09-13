"use client"

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Eye,
    LayoutGrid,
    List,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Trash2,
    UserCheck,
    Users,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/rh/confirm-dialog"
import { EmployeeAvatar } from "@/components/rh/employee-avatar"
import { EmployeeFormDialog } from "@/components/rh/employee-form-dialog"
import { StatusPill } from "@/components/rh/status-pill"
import {
    EMPLOYEE_STATUS_META,
    ON_LEAVE_META,
    contractTypeLabel,
    formatDate,
    seniority,
} from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { employeeService, type EmployeeStatus, type IEmployee } from "@/lib/api/employee.service"
import { cn } from "@/lib/utils"

type View = "cards" | "table"
type SortKey = "name" | "department" | "hireDate" | "status"

const VIEW_STORAGE_KEY = "goriya.rh.employes.view"
const ALL = "all"
const ON_LEAVE = "ON_LEAVE"

const normalise = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/** Ordre des statuts pour le tri : les présents d'abord, les partis en dernier. */
const STATUS_ORDER: Record<EmployeeStatus, number> = { ACTIVE: 0, PROBATION: 1, SUSPENDED: 2, TERMINATED: 3 }

export function EmployeesContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [employees, setEmployees] = useState<IEmployee[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [view, setView] = useState<View>("cards")
    const [query, setQuery] = useState("")
    const [status, setStatus] = useState<string>(ALL)
    const [department, setDepartment] = useState<string>(ALL)
    const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" })
    const [page, setPage] = useState(1)

    const [dialog, setDialog] = useState<{ open: boolean; employee: IEmployee | null; candidatureId: string | null }>({
        open: false,
        employee: null,
        candidatureId: null,
    })
    const [toDelete, setToDelete] = useState<IEmployee | null>(null)
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setLoadError(null)
        try {
            setEmployees(await employeeService.list())
        } catch (err) {
            setLoadError(extractApiErrorMessage(err, "Impossible de charger vos employés."))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    // Vue mémorisée par navigateur : on retrouve la présentation choisie.
    useEffect(() => {
        try {
            const saved = localStorage.getItem(VIEW_STORAGE_KEY)
            if (saved === "cards" || saved === "table") setView(saved)
        } catch {
            /* stockage indisponible : vue par défaut */
        }
    }, [])

    const changeView = (next: View) => {
        setView(next)
        setPage(1)
        try {
            localStorage.setItem(VIEW_STORAGE_KEY, next)
        } catch {
            /* stockage indisponible */
        }
    }

    // Embauche ouverte depuis la page Candidatures (?candidature=<id>) : la
    // modale s'ouvre pré-remplie, puis l'URL est nettoyée pour qu'un
    // rafraîchissement ne la rouvre pas.
    const candidatureParam = searchParams.get("candidature")
    useEffect(() => {
        if (!candidatureParam) return
        setDialog({ open: true, employee: null, candidatureId: candidatureParam })
        router.replace("/services-rh/employes", { scroll: false })
    }, [candidatureParam, router])

    const departments = useMemo(
        () => [...new Set(employees.map((e) => e.department).filter((d): d is string => !!d))].sort((a, b) => a.localeCompare(b, "fr")),
        [employees],
    )

    const stats = useMemo(
        () => ({
            headcount: employees.filter((e) => e.status !== "TERMINATED").length,
            active: employees.filter((e) => e.status === "ACTIVE" || e.status === "PROBATION").length,
            onLeave: employees.filter((e) => e.onLeaveToday).length,
            pending: employees.reduce((sum, e) => sum + e.pendingLeavesCount + e.pendingRequestsCount, 0),
        }),
        [employees],
    )

    const filtered = useMemo(() => {
        const q = normalise(query.trim())
        const rows = employees.filter((e) => {
            if (q) {
                const haystack = normalise([e.fullName, e.matricule, e.email, e.jobTitle, e.department].filter(Boolean).join(" "))
                if (!haystack.includes(q)) return false
            }
            if (status === ON_LEAVE && !e.onLeaveToday) return false
            if (status !== ALL && status !== ON_LEAVE && e.status !== status) return false
            if (department !== ALL && e.department !== department) return false
            return true
        })

        const factor = sort.dir === "asc" ? 1 : -1
        return rows.sort((a, b) => {
            let cmp = 0
            if (sort.key === "name") cmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "fr")
            if (sort.key === "department") cmp = (a.department ?? "").localeCompare(b.department ?? "", "fr")
            if (sort.key === "hireDate") cmp = a.hireDate.localeCompare(b.hireDate)
            if (sort.key === "status") cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
            return cmp * factor
        })
    }, [employees, query, status, department, sort])

    const pageSize = view === "cards" ? 12 : 10
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
    const currentPage = Math.min(page, pageCount)
    const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    useEffect(() => {
        setPage(1)
    }, [query, status, department])

    const hasFilters = query.trim() !== "" || status !== ALL || department !== ALL
    const resetFilters = () => {
        setQuery("")
        setStatus(ALL)
        setDepartment(ALL)
    }

    const toggleSort = (key: SortKey) =>
        setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }))

    const openCreate = () => setDialog({ open: true, employee: null, candidatureId: null })
    const openEdit = (employee: IEmployee) => setDialog({ open: true, employee, candidatureId: null })

    const handleSaved = (saved: IEmployee) =>
        setEmployees((prev) => (prev.some((e) => e.id === saved.id) ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved]))

    const confirmDelete = async () => {
        if (!toDelete) return
        setDeleting(true)
        try {
            await employeeService.remove(toDelete.id)
            setEmployees((prev) => prev.filter((e) => e.id !== toDelete.id))
            toast.success(`${toDelete.fullName} a été retiré du répertoire.`)
            setToDelete(null)
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La suppression de l'employé a échoué."))
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-5 pb-8">
            <PageHeader
                title="Employés"
                description="Le répertoire de vos collaborateurs : fiches, contrats, congés et demandes RH."
                actions={
                    <Button onClick={openCreate} className="gap-1.5 rounded-full px-5">
                        <Plus className="h-4 w-4" />
                        Ajouter un employé
                    </Button>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard icon={Users} label="Effectif" value={stats.headcount} hint="hors départs" />
                <StatCard icon={UserCheck} label="En poste" value={stats.active} hint="actifs et en essai" />
                <StatCard icon={CalendarDays} label="En congé aujourd'hui" value={stats.onLeave} />
                <StatCard icon={ClipboardList} label="À traiter" value={stats.pending} hint="congés et demandes" highlight={stats.pending > 0} />
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3 lg:flex-row lg:items-center">
                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Rechercher par nom, matricule, poste, e-mail..."
                        className="pl-9"
                        aria-label="Rechercher un employé"
                    />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filtrer par statut"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Tous les statuts</SelectItem>
                            {(Object.keys(EMPLOYEE_STATUS_META) as EmployeeStatus[]).map((s) => (
                                <SelectItem key={s} value={s}>{EMPLOYEE_STATUS_META[s].label}</SelectItem>
                            ))}
                            <SelectItem value={ON_LEAVE}>En congé aujourd&apos;hui</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={department} onValueChange={setDepartment}>
                        <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filtrer par département"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Tous les départements</SelectItem>
                            {departments.map((d) => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="col-span-2 flex overflow-hidden rounded-sm border border-border sm:col-span-1" role="group" aria-label="Présentation">
                        <ViewButton active={view === "cards"} onClick={() => changeView("cards")} icon={LayoutGrid} label="Cartes" />
                        <ViewButton active={view === "table"} onClick={() => changeView("table")} icon={List} label="Tableau" />
                    </div>
                </div>
            </div>

            {loading ? (
                <LoadingState view={view} />
            ) : loadError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
                    <p>{loadError}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>Réessayer</Button>
                </div>
            ) : employees.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
                        <Users className="h-6 w-6" />
                    </span>
                    <h2 className="mt-4 text-lg font-semibold text-foreground">Aucun employé pour l&apos;instant</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                        Embauchez un candidat accepté sur Goriya - sa fiche se remplit toute seule - ou ajoutez un
                        collaborateur existant à la main.
                    </p>
                    <Button onClick={openCreate} className="mt-5 gap-1.5 rounded-full px-5">
                        <Plus className="h-4 w-4" />
                        Ajouter un employé
                    </Button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">
                    Aucun employé ne correspond à ces critères.
                    {hasFilters && (
                        <div className="mt-3">
                            <Button variant="outline" size="sm" onClick={resetFilters}>Réinitialiser les filtres</Button>
                        </div>
                    )}
                </div>
            ) : view === "cards" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {pageRows.map((employee) => (
                        <EmployeeCard key={employee.id} employee={employee} onEdit={openEdit} onDelete={setToDelete} />
                    ))}
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <SortableHead label="Employé" sortKey="name" sort={sort} onSort={toggleSort} />
                                <SortableHead label="Poste" sortKey="department" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
                                <TableHead className="hidden lg:table-cell">Contrat</TableHead>
                                <SortableHead label="Embauche" sortKey="hireDate" sort={sort} onSort={toggleSort} className="hidden sm:table-cell" />
                                <SortableHead label="Statut" sortKey="status" sort={sort} onSort={toggleSort} />
                                <TableHead className="w-12 text-right"><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pageRows.map((employee) => (
                                <TableRow key={employee.id} className="cursor-pointer" onClick={() => router.push(`/services-rh/employes/${employee.id}`)}>
                                    <TableCell>
                                        <div className="flex min-w-0 items-center gap-3">
                                            <EmployeeAvatar id={employee.id} firstName={employee.firstName} lastName={employee.lastName} size="sm" />
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-foreground">{employee.fullName}</p>
                                                <p className="truncate text-xs text-muted-foreground">{employee.matricule}{employee.email ? ` · ${employee.email}` : ""}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <p className="truncate text-foreground">{employee.jobTitle}</p>
                                        <p className="truncate text-xs text-muted-foreground">{employee.department ?? "-"}</p>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-muted-foreground">{contractTypeLabel(employee.contractType)}</TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <p className="text-foreground">{formatDate(employee.hireDate)}</p>
                                        <p className="text-xs text-muted-foreground">{seniority(employee.hireDate)}</p>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            <StatusPill meta={EMPLOYEE_STATUS_META[employee.status]} />
                                            {employee.onLeaveToday && <StatusPill meta={ON_LEAVE_META} />}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <RowActions employee={employee} onEdit={openEdit} onDelete={setToDelete} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {!loading && !loadError && filtered.length > pageSize && (
                <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
                    <span>
                        {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} sur {filtered.length} employés
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

            <EmployeeFormDialog
                open={dialog.open}
                onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
                employee={dialog.employee}
                candidatureId={dialog.candidatureId}
                employees={employees}
                onSaved={handleSaved}
            />

            <ConfirmDialog
                open={!!toDelete}
                onOpenChange={(open) => !open && setToDelete(null)}
                title={`Supprimer ${toDelete?.fullName ?? "cet employé"} ?`}
                description="Sa fiche, ses congés et ses demandes RH seront définitivement supprimés. Pour un départ, préférez le statut « Parti » : l'historique reste consultable."
                confirmLabel="Supprimer"
                destructive
                loading={deleting}
                onConfirm={confirmDelete}
            />
        </div>
    )
}

function StatCard({
    icon: Icon,
    label,
    value,
    hint,
    highlight,
}: {
    icon: ComponentType<{ className?: string }>
    label: string
    value: number
    hint?: string
    highlight?: boolean
}) {
    return (
        <div className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", highlight ? "bg-amber-100 text-amber-700" : "bg-secondary text-primary")}>
                    <Icon className="h-4 w-4" />
                </span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
    )
}

function ViewButton({
    active,
    onClick,
    icon: Icon,
    label,
}: {
    active: boolean
    onClick: () => void
    icon: ComponentType<{ className?: string }>
    label: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-sm transition-colors sm:flex-none",
                active ? "bg-brand-gradient text-white" : "bg-white text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
        >
            <Icon className="h-4 w-4" />
            <span className="sm:sr-only lg:not-sr-only">{label}</span>
        </button>
    )
}

function SortableHead({
    label,
    sortKey,
    sort,
    onSort,
    className,
}: {
    label: string
    sortKey: SortKey
    sort: { key: SortKey; dir: "asc" | "desc" }
    onSort: (key: SortKey) => void
    className?: string
}) {
    const active = sort.key === sortKey
    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown
    return (
        <TableHead className={className} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
            <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 font-medium hover:text-foreground">
                {label}
                <Icon className={cn("h-3.5 w-3.5", active ? "text-foreground" : "text-muted-foreground/60")} />
            </button>
        </TableHead>
    )
}

function RowActions({
    employee,
    onEdit,
    onDelete,
}: {
    employee: IEmployee
    onEdit: (employee: IEmployee) => void
    onDelete: (employee: IEmployee) => void
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Actions pour ${employee.fullName}`} className="hover:bg-muted hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                    <Link href={`/services-rh/employes/${employee.id}`}>
                        <Eye className="h-4 w-4" />
                        Voir la fiche
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onEdit(employee)}>
                    <Pencil className="h-4 w-4" />
                    Modifier
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onDelete(employee)} className="text-red-600 focus:text-red-600">
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function EmployeeCard({
    employee,
    onEdit,
    onDelete,
}: {
    employee: IEmployee
    onEdit: (employee: IEmployee) => void
    onDelete: (employee: IEmployee) => void
}) {
    const pending = employee.pendingLeavesCount + employee.pendingRequestsCount
    return (
        <div className="group relative flex flex-col rounded-xl border border-border bg-white transition-shadow hover:shadow-md">
            <div className="absolute right-2 top-2 z-10">
                <RowActions employee={employee} onEdit={onEdit} onDelete={onDelete} />
            </div>

            <Link href={`/services-rh/employes/${employee.id}`} className="flex flex-1 flex-col rounded-xl p-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                <div className="flex items-start gap-3 pr-8">
                    <EmployeeAvatar id={employee.id} firstName={employee.firstName} lastName={employee.lastName} />
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{employee.fullName}</p>
                        <p className="truncate text-sm text-muted-foreground">{employee.jobTitle}</p>
                        {employee.department && <p className="truncate text-xs text-muted-foreground">{employee.department}</p>}
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                    <StatusPill meta={EMPLOYEE_STATUS_META[employee.status]} />
                    {employee.onLeaveToday && <StatusPill meta={ON_LEAVE_META} />}
                    {employee.source === "CANDIDATURE" && (
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-primary">Via Goriya</span>
                    )}
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3 text-xs">
                    <div>
                        <dt className="text-muted-foreground">Matricule</dt>
                        <dd className="font-medium text-foreground">{employee.matricule}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">Contrat</dt>
                        <dd className="font-medium text-foreground">{contractTypeLabel(employee.contractType)}</dd>
                    </div>
                    <div className="col-span-2">
                        <dt className="text-muted-foreground">Ancienneté</dt>
                        <dd className="font-medium text-foreground">
                            {seniority(employee.hireDate)} <span className="font-normal text-muted-foreground">· depuis le {formatDate(employee.hireDate)}</span>
                        </dd>
                    </div>
                </dl>

                {pending > 0 && (
                    <p className="mt-3 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
                        {pending} élément{pending > 1 ? "s" : ""} à traiter (congés ou demandes)
                    </p>
                )}
            </Link>
        </div>
    )
}

function LoadingState({ view }: { view: View }) {
    if (view === "table") {
        return (
            <div className="space-y-2 rounded-xl border border-border bg-white p-3" aria-busy="true">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
                ))}
            </div>
        )
    }
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-52 animate-pulse rounded-xl bg-muted" />
            ))}
        </div>
    )
}
