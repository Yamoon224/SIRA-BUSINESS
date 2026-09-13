"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Download, Loader2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusPill } from "@/components/rh/status-pill"
import { PAYROLL_STATUS_META, capitalize, formatFcfa } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { payrollService, type IPayslip } from "@/lib/api/payroll.service"
import type { IEmployee } from "@/lib/api/employee.service"

interface EmployeePayslipsTabProps {
    employee: IEmployee
    payslips: IPayslip[]
    loading: boolean
}

/** Onglet « Paie » de la fiche : bulletins de l'employé, période par période. */
export function EmployeePayslipsTab({ employee, payslips, loading }: EmployeePayslipsTabProps) {
    const [downloadingId, setDownloadingId] = useState<string | null>(null)

    const download = async (payslip: IPayslip) => {
        if (!payslip.run) return
        setDownloadingId(payslip.id)
        try {
            await payrollService.downloadPayslip(payslip, payslip.run)
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "Le téléchargement du bulletin a échoué."))
        } finally {
            setDownloadingId(null)
        }
    }

    if (loading) {
        return <div className="h-40 animate-pulse rounded-xl bg-muted" aria-busy="true" />
    }

    if (payslips.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center">
                <Wallet className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Aucun bulletin de paie pour {employee.firstName}.</p>
                <Button asChild variant="outline" size="sm" className="mt-3 hover:bg-muted hover:text-foreground">
                    <Link href="/services-rh/paie">Aller à la paie</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>Période</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">Brut</TableHead>
                        <TableHead className="text-right">Net à payer</TableHead>
                        <TableHead className="hidden text-right md:table-cell">Coût employeur</TableHead>
                        <TableHead className="w-12 text-right"><span className="sr-only">Télécharger</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payslips.map((payslip) => (
                        <TableRow key={payslip.id}>
                            <TableCell>
                                {payslip.run ? (
                                    <Link href={`/services-rh/paie/${payslip.run.id}`} className="font-medium text-foreground hover:underline">
                                        {capitalize(payslip.run.label)}
                                    </Link>
                                ) : (
                                    <span>-</span>
                                )}
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    {payslip.run && <StatusPill meta={PAYROLL_STATUS_META[payslip.run.status]} />}
                                    <span className="text-xs text-muted-foreground">{payslip.workedDays} j payés</span>
                                </div>
                            </TableCell>
                            <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatFcfa(payslip.gross)}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">{formatFcfa(payslip.net)}</TableCell>
                            <TableCell className="hidden text-right tabular-nums md:table-cell">{formatFcfa(payslip.employerCost)}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    disabled={downloadingId === payslip.id || !payslip.run}
                                    aria-label="Télécharger le bulletin"
                                    title="Télécharger le bulletin (.docx)"
                                    onClick={() => void download(payslip)}
                                    className="hover:bg-muted hover:text-foreground"
                                >
                                    {downloadingId === payslip.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
