"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Banknote, Building2, Download, FileSpreadsheet, Loader2, MoreHorizontal, Plus, Trash2, Users, Wallet } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/rh/confirm-dialog"
import { KpiCard } from "@/components/rh/kpi-card"
import { NewPayrollRunDialog } from "@/components/rh/new-payroll-run-dialog"
import { PayrollSettingsForm } from "@/components/rh/payroll-settings-form"
import { StatusPill } from "@/components/rh/status-pill"
import { PAYROLL_STATUS_META, capitalize, formatFcfa } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { payrollService, type IPayrollRun } from "@/lib/api/payroll.service"

/**
 * Page Paie : périodes de paie de l'entreprise et paramètres de calcul. Le
 * détail d'une période (bulletins, validation, paiement) a sa propre page.
 */
export function PaieContent() {
    const router = useRouter()
    const [runs, setRuns] = useState<IPayrollRun[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [tab, setTab] = useState("periodes")
    const [newOpen, setNewOpen] = useState(false)
    const [toDelete, setToDelete] = useState<IPayrollRun | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [exportingId, setExportingId] = useState<string | null>(null)

    const load = useCallback(async () => {
        try {
            setRuns(await payrollService.runs())
            setLoadError(null)
        } catch (err) {
            setLoadError(extractApiErrorMessage(err, "Impossible de charger les périodes de paie."))
        }
    }, [])

    useEffect(() => {
        void load().finally(() => setLoading(false))
    }, [load])

    const draft = runs.find((r) => r.status === "DRAFT") ?? null
    // Indicateurs : la dernière paie validée ou payée, sinon le brouillon en cours.
    const reference = runs.find((r) => r.status !== "DRAFT") ?? runs[0] ?? null

    const exportRun = async (run: IPayrollRun) => {
        setExportingId(run.id)
        try {
            await payrollService.exportRun(run)
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "L'export du journal de paie a échoué."))
        } finally {
            setExportingId(null)
        }
    }

    const confirmDelete = async () => {
        if (!toDelete) return
        setDeleting(true)
        try {
            await payrollService.removeRun(toDelete.id)
            toast.success(`Brouillon de ${toDelete.label} supprimé.`)
            setToDelete(null)
            await load()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La suppression du brouillon a échoué."))
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-5 pb-8">
            <PageHeader
                title="Paie"
                description="Bulletins mensuels calculés depuis les contrats, les congés et les avances de vos employés."
                actions={
                    <Button
                        onClick={() => setNewOpen(true)}
                        disabled={loading || !!draft}
                        title={draft ? `La paie de ${draft.label} est en brouillon` : undefined}
                        className="gap-1.5 rounded-full px-5"
                    >
                        <Plus className="h-4 w-4" />
                        Préparer une paie
                    </Button>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard icon={Banknote} label="Masse salariale brute" value={reference ? formatFcfa(reference.totals.gross) : "—"} hint={reference ? capitalize(reference.label) : "Aucune paie"} />
                <KpiCard icon={Wallet} label="Net à payer" value={reference ? formatFcfa(reference.totals.net) : "—"} hint={reference ? PAYROLL_STATUS_META[reference.status].label : undefined} />
                <KpiCard icon={Building2} label="Coût employeur" value={reference ? formatFcfa(reference.totals.employerCost) : "—"} hint={reference ? `dont ${formatFcfa(reference.totals.employerContributions)} de charges` : undefined} />
                <KpiCard icon={Users} label="Salariés payés" value={reference ? reference.employeesCount : "—"} />
            </div>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="periodes">Périodes</TabsTrigger>
                    <TabsTrigger value="parametres">Paramètres</TabsTrigger>
                </TabsList>

                <TabsContent value="periodes" className="mt-4 space-y-3">
                    {draft && (
                        <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                            <p>
                                La paie de <strong>{draft.label}</strong> est en brouillon : ajustez les bulletins puis validez-la avant de préparer la
                                suivante.
                            </p>
                            <Button asChild size="sm">
                                <Link href={`/services-rh/paie/${draft.id}`}>Ouvrir le brouillon</Link>
                            </Button>
                        </div>
                    )}

                    {loading ? (
                        <div className="space-y-2 rounded-xl border border-border bg-white p-3" aria-busy="true">
                            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}
                        </div>
                    ) : loadError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
                            <p>{loadError}</p>
                            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setLoading(true); void load().finally(() => setLoading(false)) }}>Réessayer</Button>
                        </div>
                    ) : runs.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center">
                            <FileSpreadsheet className="mx-auto h-9 w-9 text-muted-foreground" />
                            <h2 className="mt-3 text-lg font-semibold text-foreground">Aucune paie préparée</h2>
                            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                                Vérifiez d&apos;abord vos paramètres de paie avec votre comptable, puis préparez la paie du mois : les bulletins de
                                tous vos employés sont calculés en une fois.
                            </p>
                            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                                <Button variant="outline" onClick={() => setTab("parametres")} className="rounded-full px-5 hover:bg-muted hover:text-foreground">
                                    Vérifier les paramètres
                                </Button>
                                <Button onClick={() => setNewOpen(true)} className="rounded-full px-5">
                                    <Plus className="h-4 w-4" />
                                    Préparer une paie
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-border bg-white">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                                        <TableHead>Période</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="hidden text-right sm:table-cell">Salariés</TableHead>
                                        <TableHead className="hidden text-right md:table-cell">Brut</TableHead>
                                        <TableHead className="text-right">Net à payer</TableHead>
                                        <TableHead className="hidden text-right lg:table-cell">Coût employeur</TableHead>
                                        <TableHead className="w-12 text-right"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {runs.map((run) => (
                                        <TableRow key={run.id} className="cursor-pointer" onClick={() => router.push(`/services-rh/paie/${run.id}`)}>
                                            <TableCell className="font-medium text-foreground">{capitalize(run.label)}</TableCell>
                                            <TableCell>
                                                <StatusPill meta={PAYROLL_STATUS_META[run.status]} />
                                            </TableCell>
                                            <TableCell className="hidden text-right tabular-nums sm:table-cell">{run.employeesCount}</TableCell>
                                            <TableCell className="hidden text-right tabular-nums md:table-cell">{formatFcfa(run.totals.gross)}</TableCell>
                                            <TableCell className="text-right font-semibold tabular-nums">{formatFcfa(run.totals.net)}</TableCell>
                                            <TableCell className="hidden text-right tabular-nums lg:table-cell">{formatFcfa(run.totals.employerCost)}</TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="icon-sm" variant="ghost" disabled={exportingId === run.id} aria-label={`Actions sur la paie de ${run.label}`} className="hover:bg-muted hover:text-foreground">
                                                            {exportingId === run.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/services-rh/paie/${run.id}`}>
                                                                <FileSpreadsheet className="h-4 w-4" />
                                                                Ouvrir les bulletins
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => void exportRun(run)}>
                                                            <Download className="h-4 w-4" />
                                                            Exporter le journal (CSV)
                                                        </DropdownMenuItem>
                                                        {run.status === "DRAFT" && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onSelect={() => setToDelete(run)} className="text-red-600 focus:text-red-600">
                                                                    <Trash2 className="h-4 w-4" />
                                                                    Supprimer le brouillon
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="parametres" className="mt-4">
                    <PayrollSettingsForm />
                </TabsContent>
            </Tabs>

            <NewPayrollRunDialog open={newOpen} onOpenChange={setNewOpen} runs={runs} onCreated={(run) => router.push(`/services-rh/paie/${run.id}`)} />

            <ConfirmDialog
                open={!!toDelete}
                onOpenChange={(open) => !open && setToDelete(null)}
                title={`Supprimer le brouillon de ${toDelete?.label ?? ""} ?`}
                description="Les bulletins calculés et les primes ou retenues saisies seront perdus. Vous pourrez préparer à nouveau cette paie."
                confirmLabel="Supprimer"
                destructive
                loading={deleting}
                onConfirm={confirmDelete}
            />
        </div>
    )
}
