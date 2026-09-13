"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    AlertTriangle,
    ArrowLeft,
    Banknote,
    Building2,
    CheckCircle2,
    Download,
    FileSpreadsheet,
    Landmark,
    Loader2,
    RefreshCw,
    RotateCcw,
    Search,
    Trash2,
    Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmDialog } from "@/components/rh/confirm-dialog"
import { KpiCard } from "@/components/rh/kpi-card"
import { PayRunDialog } from "@/components/rh/pay-run-dialog"
import { PayslipDialog } from "@/components/rh/payslip-dialog"
import { StatusPill } from "@/components/rh/status-pill"
import { PAYROLL_STATUS_META, formatDate, formatFcfa, normaliseText } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { payrollService, type IPayrollRun, type IPayslip } from "@/lib/api/payroll.service"
import { cn } from "@/lib/utils"

type Busy = "recompute" | "validate" | "reopen" | "export" | "delete" | null

/**
 * Détail d'une période de paie : bulletins, ajustements, validation, paiement
 * et exports.
 */
export function PayrollRunDetail({ id }: { id: string }) {
    const router = useRouter()
    const [run, setRun] = useState<IPayrollRun | null>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [busy, setBusy] = useState<Busy>(null)
    const [confirm, setConfirm] = useState<"validate" | "reopen" | "delete" | null>(null)
    const [payOpen, setPayOpen] = useState(false)
    const [openPayslipId, setOpenPayslipId] = useState<string | null>(null)
    const [query, setQuery] = useState("")

    const load = useCallback(async () => {
        try {
            setRun(await payrollService.run(id))
            setNotFound(false)
            setLoadError(null)
        } catch (err) {
            if ((err as { statusCode?: number })?.statusCode === 404) setNotFound(true)
            else setLoadError(extractApiErrorMessage(err, "Impossible de charger cette paie."))
        }
    }, [id])

    useEffect(() => {
        void load().finally(() => setLoading(false))
    }, [load])

    const payslips = useMemo(() => {
        const q = normaliseText(query.trim())
        return (run?.payslips ?? []).filter(
            (p) => !q || normaliseText(`${p.employee.fullName} ${p.employee.matricule} ${p.employee.jobTitle} ${p.employee.department ?? ""}`).includes(q),
        )
    }, [run, query])

    const blocked = (run?.payslips ?? []).filter((p) => p.warnings.some((w) => w.blocking))
    const openPayslip = run?.payslips?.find((p) => p.id === openPayslipId) ?? null

    const act = async (action: Exclude<Busy, null>, call: () => Promise<IPayrollRun | void>, success: string, failure: string) => {
        setBusy(action)
        try {
            const updated = await call()
            if (updated) setRun(updated)
            if (success) toast.success(success)
            setConfirm(null)
        } catch (err) {
            toast.error(extractApiErrorMessage(err, failure))
        } finally {
            setBusy(null)
        }
    }

    const onPayslipSaved = async (updated: IPayslip) => {
        // Le bulletin change, les totaux de la période aussi : on recharge la période.
        setRun((prev) => (prev ? { ...prev, payslips: prev.payslips?.map((p) => (p.id === updated.id ? updated : p)) } : prev))
        await load()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (notFound || loadError || !run) {
        return (
            <div className="mx-auto max-w-md rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center">
                <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground" />
                <h1 className="mt-3 text-lg font-semibold text-foreground">{notFound ? "Paie introuvable" : "Paie indisponible"}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{notFound ? "Cette période n'existe pas ou a été supprimée." : loadError}</p>
                <Button asChild className="mt-5"><Link href="/services-rh/paie">Retour à la paie</Link></Button>
            </div>
        )
    }

    const status = PAYROLL_STATUS_META[run.status]
    const draft = run.status === "DRAFT"

    return (
        <div className="space-y-5 pb-8">
            <Link href="/services-rh/paie" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Paie
            </Link>

            <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-semibold text-foreground">Paie de {run.label}</h1>
                        <StatusPill meta={status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {status.hint}
                        {run.validatedAt ? ` · validée le ${formatDate(run.validatedAt)}` : ""}
                        {run.paymentDate ? ` · payée le ${formatDate(run.paymentDate)}` : ""}
                        {run.paymentReference ? ` (réf. ${run.paymentReference})` : ""}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() => void act("export", () => payrollService.exportRun(run), "", "L'export du journal de paie a échoué.")}
                        className="hover:bg-muted hover:text-foreground"
                    >
                        {busy === "export" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Journal CSV
                    </Button>
                    {draft && (
                        <>
                            <Button
                                variant="outline"
                                disabled={busy !== null}
                                onClick={() => void act("recompute", () => payrollService.recompute(run.id), "Bulletins recalculés avec les données du jour.", "Le recalcul a échoué.")}
                                className="hover:bg-muted hover:text-foreground"
                            >
                                {busy === "recompute" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Recalculer
                            </Button>
                            <Button variant="outline" disabled={busy !== null} onClick={() => setConfirm("delete")} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                                Supprimer
                            </Button>
                            <Button disabled={busy !== null || run.employeesCount === 0 || blocked.length > 0} onClick={() => setConfirm("validate")}>
                                <CheckCircle2 className="h-4 w-4" />
                                Valider la paie
                            </Button>
                        </>
                    )}
                    {run.status === "VALIDATED" && (
                        <>
                            <Button variant="outline" disabled={busy !== null} onClick={() => setConfirm("reopen")} className="hover:bg-muted hover:text-foreground">
                                <RotateCcw className="h-4 w-4" />
                                Rouvrir
                            </Button>
                            <Button disabled={busy !== null} onClick={() => setPayOpen(true)} className="bg-green-600 text-white hover:bg-green-700">
                                <Landmark className="h-4 w-4" />
                                Marquer comme payée
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard icon={Banknote} label="Salaires bruts" value={formatFcfa(run.totals.gross)} hint={`${run.employeesCount} bulletin${run.employeesCount > 1 ? "s" : ""}`} />
                <KpiCard
                    icon={FileSpreadsheet}
                    label="Cotisations et impôt"
                    value={formatFcfa(run.totals.employeeContributions + run.totals.tax)}
                    hint={`salariales ${formatFcfa(run.totals.employeeContributions)} · impôt ${formatFcfa(run.totals.tax)}`}
                />
                <KpiCard icon={Wallet} label="Net à payer" value={formatFcfa(run.totals.net)} />
                <KpiCard icon={Building2} label="Coût employeur" value={formatFcfa(run.totals.employerCost)} hint={`dont ${formatFcfa(run.totals.employerContributions)} de charges patronales`} />
            </div>

            {draft && blocked.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <p className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-4 w-4" />
                        {blocked.length} bulletin{blocked.length > 1 ? "s" : ""} à compléter avant de valider
                    </p>
                    <ul className="mt-2 space-y-1">
                        {blocked.map((p) => (
                            <li key={p.id}>
                                <button type="button" onClick={() => setOpenPayslipId(p.id)} className="font-medium underline-offset-2 hover:underline">
                                    {p.employee.fullName}
                                </button>{" "}
                                - {p.warnings.filter((w) => w.blocking).map((w) => w.message).join(" ")}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold text-foreground">Bulletins</h2>
                <div className="relative sm:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un salarié..." className="bg-white pl-9" aria-label="Rechercher un salarié" />
                </div>
            </div>

            {run.employeesCount === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">
                    Aucun employé n&apos;est à payer sur cette période : vérifiez les dates d&apos;embauche et de fin de contrat dans le répertoire.
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableHead>Salarié</TableHead>
                                <TableHead className="hidden text-right sm:table-cell">Jours payés</TableHead>
                                <TableHead className="hidden text-right md:table-cell">Brut</TableHead>
                                <TableHead className="hidden text-right lg:table-cell">Retenues</TableHead>
                                <TableHead className="text-right">Net à payer</TableHead>
                                <TableHead className="hidden text-right xl:table-cell">Coût employeur</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payslips.map((payslip) => {
                                const warning = payslip.warnings.find((w) => w.blocking) ?? payslip.warnings[0]
                                const withheld = payslip.employeeContributions + payslip.tax + payslip.advances + payslip.otherDeductions
                                return (
                                    <TableRow key={payslip.id} className="cursor-pointer" onClick={() => setOpenPayslipId(payslip.id)}>
                                        <TableCell>
                                            <div className="flex items-start gap-2">
                                                {warning && (
                                                    <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", warning.blocking ? "text-red-600" : "text-amber-600")} aria-label={warning.message} />
                                                )}
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-foreground">{payslip.employee.fullName}</p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {payslip.employee.matricule} · {payslip.employee.jobTitle}
                                                        {payslip.bonuses.length > 0 ? ` · ${payslip.bonuses.length} prime${payslip.bonuses.length > 1 ? "s" : ""}` : ""}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden text-right tabular-nums sm:table-cell">
                                            {payslip.workedDays} / {payslip.businessDays}
                                        </TableCell>
                                        <TableCell className="hidden text-right tabular-nums md:table-cell">{formatFcfa(payslip.gross)}</TableCell>
                                        <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">{formatFcfa(withheld)}</TableCell>
                                        <TableCell className={cn("text-right font-semibold tabular-nums", payslip.net < 0 && "text-red-600")}>{formatFcfa(payslip.net)}</TableCell>
                                        <TableCell className="hidden text-right tabular-nums xl:table-cell">{formatFcfa(payslip.employerCost)}</TableCell>
                                    </TableRow>
                                )
                            })}
                            {payslips.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Aucun salarié ne correspond à cette recherche.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <PayslipDialog
                open={!!openPayslip}
                onOpenChange={(open) => !open && setOpenPayslipId(null)}
                payslip={openPayslip}
                run={run}
                onSaved={(updated) => void onPayslipSaved(updated)}
            />

            <PayRunDialog open={payOpen} onOpenChange={setPayOpen} run={run} onDone={setRun} />

            <ConfirmDialog
                open={confirm === "validate"}
                onOpenChange={(open) => !open && setConfirm(null)}
                title={`Valider la paie de ${run.label} ?`}
                description={`Les bulletins sont recalculés une dernière fois puis figés, et les avances sur salaire retenues sont marquées comme déduites. Net total : ${formatFcfa(run.totals.net)}.`}
                confirmLabel="Valider"
                loading={busy === "validate"}
                onConfirm={() => act("validate", () => payrollService.validate(run.id), `Paie de ${run.label} validée.`, "La validation a échoué.")}
            />
            <ConfirmDialog
                open={confirm === "reopen"}
                onOpenChange={(open) => !open && setConfirm(null)}
                title={`Rouvrir la paie de ${run.label} ?`}
                description="Elle repasse en brouillon : les bulletins redeviennent modifiables et les avances retenues seront recalculées."
                confirmLabel="Rouvrir"
                loading={busy === "reopen"}
                onConfirm={() => act("reopen", () => payrollService.reopen(run.id), `Paie de ${run.label} rouverte.`, "La réouverture a échoué.")}
            />
            <ConfirmDialog
                open={confirm === "delete"}
                onOpenChange={(open) => !open && setConfirm(null)}
                title={`Supprimer le brouillon de ${run.label} ?`}
                description="Les bulletins calculés et les primes ou retenues saisies seront perdus."
                confirmLabel="Supprimer"
                destructive
                loading={busy === "delete"}
                onConfirm={() =>
                    act(
                        "delete",
                        async () => {
                            await payrollService.removeRun(run.id)
                            router.push("/services-rh/paie")
                        },
                        `Brouillon de ${run.label} supprimé.`,
                        "La suppression a échoué.",
                    )
                }
            />
        </div>
    )
}
