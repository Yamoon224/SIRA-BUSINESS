"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LEAVE_TYPE_META, formatDate, toIsoDate, todayIso } from "@/lib/data/rh"
import type { IEmployeeLeave, IEmployeeSummary, LeaveType } from "@/lib/api/employee.service"
import { cn } from "@/lib/utils"

type Row = { employeeId: string; employee?: IEmployeeSummary | null; leaves: IEmployeeLeave[] }

/**
 * Planning mensuel des absences : une ligne par employé absent dans le mois,
 * une colonne par jour. Un congé approuvé est plein, un congé en attente est
 * pâle ; les refus et annulations n'y figurent pas. Les week-ends restent gris
 * même au milieu d'un congé : ils ne sont pas décomptés.
 */
export function LeavePlanning({ leaves }: { leaves: IEmployeeLeave[] }) {
    const [month, setMonth] = useState(() => {
        const now = new Date()
        return new Date(now.getFullYear(), now.getMonth(), 1)
    })

    const days = useMemo(() => {
        const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
        return Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))
    }, [month])

    const monthStart = toIsoDate(days[0])
    const monthEnd = toIsoDate(days[days.length - 1])
    const today = todayIso()

    const rows = useMemo<Row[]>(() => {
        const byEmployee = new Map<string, Row>()
        for (const leave of leaves) {
            if (leave.status !== "APPROVED" && leave.status !== "PENDING") continue
            if (leave.startDate > monthEnd || leave.endDate < monthStart) continue
            const row = byEmployee.get(leave.employeeId) ?? { employeeId: leave.employeeId, employee: leave.employee, leaves: [] }
            row.leaves.push(leave)
            byEmployee.set(leave.employeeId, row)
        }
        return [...byEmployee.values()].sort((a, b) =>
            `${a.employee?.lastName ?? ""} ${a.employee?.firstName ?? ""}`.localeCompare(`${b.employee?.lastName ?? ""} ${b.employee?.firstName ?? ""}`, "fr"),
        )
    }, [leaves, monthStart, monthEnd])

    const typesShown = useMemo(() => {
        const set = new Set<LeaveType>()
        rows.forEach((row) => row.leaves.forEach((l) => set.add(l.type)))
        return [...set]
    }, [rows])

    const shift = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
    const isCurrentMonth = monthStart <= today && today <= monthEnd
    const label = month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })

    return (
        <section className="overflow-hidden rounded-xl border border-border bg-white">
            <header className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon-sm" aria-label="Mois précédent" onClick={() => shift(-1)} className="hover:bg-muted hover:text-foreground">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <p className="min-w-36 text-center text-sm font-semibold capitalize text-foreground" aria-live="polite">{label}</p>
                    <Button variant="outline" size="icon-sm" aria-label="Mois suivant" onClick={() => shift(1)} className="hover:bg-muted hover:text-foreground">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    {!isCurrentMonth && (
                        <Button variant="ghost" size="sm" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="hover:bg-muted hover:text-foreground">
                            Aujourd&apos;hui
                        </Button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    {rows.length === 0 ? "Aucune absence ce mois-ci" : `${rows.length} employé${rows.length > 1 ? "s" : ""} absent${rows.length > 1 ? "s" : ""} sur la période`}
                </p>
            </header>

            {rows.length === 0 ? (
                <div className="px-6 py-12 text-center">
                    <CalendarRange className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Aucun congé approuvé ou en attente en {label}.</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs" style={{ minWidth: 208 + days.length * 30 }}>
                            <thead>
                                <tr>
                                    <th scope="col" className="sticky left-0 z-10 w-52 min-w-52 border-b border-r border-border bg-white px-3 py-2 text-left font-medium text-muted-foreground">
                                        Employé
                                    </th>
                                    {days.map((day) => {
                                        const iso = toIsoDate(day)
                                        const weekend = day.getDay() === 0 || day.getDay() === 6
                                        return (
                                            <th
                                                key={iso}
                                                scope="col"
                                                className={cn(
                                                    "w-[30px] min-w-[30px] border-b border-border px-0 py-1.5 text-center font-medium",
                                                    weekend ? "bg-muted/70 text-muted-foreground" : "text-foreground",
                                                    iso === today && "bg-secondary text-primary",
                                                )}
                                            >
                                                <span className="block text-[10px] uppercase">{day.toLocaleDateString("fr-FR", { weekday: "narrow" })}</span>
                                                <span className="block">{day.getDate()}</span>
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.employeeId} className="border-b border-border last:border-0">
                                        <th scope="row" className="sticky left-0 z-10 border-r border-border bg-white px-3 py-2 text-left font-normal">
                                            {row.employee ? (
                                                <Link href={`/services-rh/employes/${row.employee.id}`} className="block truncate text-sm font-medium text-foreground hover:underline">
                                                    {row.employee.fullName}
                                                </Link>
                                            ) : (
                                                <span className="block truncate text-sm text-muted-foreground">Employé</span>
                                            )}
                                            <span className="block truncate text-[11px] text-muted-foreground">{row.employee?.jobTitle}</span>
                                        </th>
                                        {days.map((day) => {
                                            const iso = toIsoDate(day)
                                            const weekend = day.getDay() === 0 || day.getDay() === 6
                                            const leave = row.leaves.find((l) => l.startDate <= iso && l.endDate >= iso)
                                            return (
                                                <td key={iso} className={cn("h-11 p-0.5", weekend && "bg-muted/70", iso === today && !weekend && "bg-secondary/50")}>
                                                    {leave && !weekend && (
                                                        <div
                                                            title={`${LEAVE_TYPE_META[leave.type]?.label} · du ${formatDate(leave.startDate)} au ${formatDate(leave.endDate)}${leave.status === "PENDING" ? " · en attente" : ""}`}
                                                            className={cn(
                                                                "h-full w-full rounded-sm",
                                                                LEAVE_TYPE_META[leave.type]?.color ?? "bg-slate-400",
                                                                leave.status === "PENDING" && "opacity-35",
                                                            )}
                                                        />
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
                        {typesShown.map((type) => (
                            <span key={type} className="inline-flex items-center gap-1.5">
                                <span className={cn("h-3 w-3 rounded-sm", LEAVE_TYPE_META[type].color)} />
                                {LEAVE_TYPE_META[type].label}
                            </span>
                        ))}
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-sm bg-blue-500 opacity-35" />
                            Teinte pâle : en attente de validation
                        </span>
                    </footer>
                </>
            )}
        </section>
    )
}
