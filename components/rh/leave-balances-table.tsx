"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarPlus, Search, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmployeeAvatar } from "@/components/rh/employee-avatar"
import { normaliseText } from "@/lib/data/rh"
import type { ILeaveBalanceRow } from "@/lib/api/employee.service"
import { cn } from "@/lib/utils"

interface LeaveBalancesTableProps {
    rows: ILeaveBalanceRow[] | null
    loading: boolean
    error: string | null
    year: number
    years: number[]
    onYearChange: (year: number) => void
    onRetry: () => void
    /** Pose d'un congé pour cet employé (année en cours uniquement). */
    onPlanLeave?: (employeeId: string) => void
}

type SortKey = "name" | "remaining"

/**
 * Soldes de congés payés de tous les employés présents. Le reste disponible
 * passe en orange sous 5 jours et en rouge s'il est dépassé : ce sont les
 * situations qu'un service RH veut voir sans chercher.
 */
export function LeaveBalancesTable({ rows, loading, error, year, years, onYearChange, onRetry, onPlanLeave }: LeaveBalancesTableProps) {
    const [query, setQuery] = useState("")
    const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" })

    const visible = useMemo(() => {
        const q = normaliseText(query.trim())
        const filtered = (rows ?? []).filter((row) =>
            !q || normaliseText(`${row.employee.fullName} ${row.employee.matricule} ${row.employee.department ?? ""}`).includes(q),
        )
        const factor = sort.dir === "asc" ? 1 : -1
        return filtered.sort((a, b) =>
            sort.key === "remaining"
                ? (a.remaining - b.remaining) * factor
                : `${a.employee.lastName} ${a.employee.firstName}`.localeCompare(`${b.employee.lastName} ${b.employee.firstName}`, "fr") * factor,
        )
    }, [rows, query, sort])

    const toggleSort = (key: SortKey) =>
        setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }))

    const SortIcon = ({ sortKey }: { sortKey: SortKey }) => {
        const Icon = sort.key !== sortKey ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown
        return <Icon className={cn("h-3.5 w-3.5", sort.key === sortKey ? "text-foreground" : "text-muted-foreground/60")} />
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un employé..." className="bg-white pl-9" aria-label="Rechercher un employé" />
                </div>
                <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
                    <SelectTrigger className="w-full bg-white sm:w-[150px]" aria-label="Année"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {years.map((y) => <SelectItem key={y} value={String(y)}>Année {y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="space-y-2 rounded-xl border border-border bg-white p-3" aria-busy="true">
                    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}
                </div>
            ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
                    <p>{error}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Réessayer</Button>
                </div>
            ) : visible.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center">
                    <Wallet className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                        {rows && rows.length > 0 ? "Aucun employé ne correspond à cette recherche." : "Aucun employé présent dans votre répertoire."}
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableHead aria-sort={sort.key === "name" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                                    <button type="button" onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 font-medium hover:text-foreground">
                                        Employé <SortIcon sortKey="name" />
                                    </button>
                                </TableHead>
                                <TableHead className="hidden text-right sm:table-cell">Droit</TableHead>
                                <TableHead className="hidden text-right md:table-cell">Pris</TableHead>
                                <TableHead className="hidden text-right md:table-cell">En attente</TableHead>
                                <TableHead className="text-right" aria-sort={sort.key === "remaining" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                                    <button type="button" onClick={() => toggleSort("remaining")} className="inline-flex items-center gap-1 font-medium hover:text-foreground">
                                        Restant <SortIcon sortKey="remaining" />
                                    </button>
                                </TableHead>
                                {onPlanLeave && <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((row) => {
                                const takenPct = row.entitlement > 0 ? Math.min(100, (row.taken / row.entitlement) * 100) : 0
                                const pendingPct = row.entitlement > 0 ? Math.min(100 - takenPct, (row.pending / row.entitlement) * 100) : 0
                                const tone = row.remaining < 0 ? "text-red-600" : row.remaining <= 5 ? "text-amber-700" : "text-foreground"
                                return (
                                    <TableRow key={row.employee.id}>
                                        <TableCell>
                                            <div className="flex min-w-0 items-center gap-3">
                                                <EmployeeAvatar id={row.employee.id} firstName={row.employee.firstName} lastName={row.employee.lastName} size="sm" />
                                                <div className="min-w-0">
                                                    <Link href={`/services-rh/employes/${row.employee.id}`} className="block truncate font-medium text-foreground hover:underline">
                                                        {row.employee.fullName}
                                                    </Link>
                                                    <p className="truncate text-xs text-muted-foreground">{row.employee.jobTitle}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden text-right tabular-nums sm:table-cell">{row.entitlement} j</TableCell>
                                        <TableCell className="hidden text-right tabular-nums md:table-cell">{row.taken} j</TableCell>
                                        <TableCell className="hidden text-right tabular-nums md:table-cell">{row.pending > 0 ? `${row.pending} j` : "—"}</TableCell>
                                        <TableCell className="text-right">
                                            <p className={cn("font-semibold tabular-nums", tone)}>{row.remaining} j</p>
                                            <div className="ml-auto mt-1 flex h-1.5 w-24 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${row.taken} jours pris et ${row.pending} en attente sur ${row.entitlement}`}>
                                                <div className="bg-brand-gradient" style={{ width: `${takenPct}%` }} />
                                                <div className="bg-amber-300" style={{ width: `${pendingPct}%` }} />
                                            </div>
                                        </TableCell>
                                        {onPlanLeave && (
                                            <TableCell className="text-right">
                                                <Button
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    aria-label={`Poser un congé pour ${row.employee.fullName}`}
                                                    title="Poser un congé"
                                                    onClick={() => onPlanLeave(row.employee.id)}
                                                    className="hover:bg-muted hover:text-foreground"
                                                >
                                                    <CalendarPlus className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
