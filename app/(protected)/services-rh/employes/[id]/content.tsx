"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    ArrowLeft,
    CalendarDays,
    ChevronDown,
    ClipboardList,
    Clock3,
    Loader2,
    Pencil,
    Sparkles,
    Trash2,
    UserX,
    Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/rh/confirm-dialog"
import { EmployeeAvatar } from "@/components/rh/employee-avatar"
import { EmployeeContractsTab } from "@/components/rh/employee-contracts-tab"
import { EmployeeFormDialog } from "@/components/rh/employee-form-dialog"
import { EmployeeHistory } from "@/components/rh/employee-history"
import { EmployeeLeavesTab } from "@/components/rh/employee-leaves-tab"
import { EmployeeOverview } from "@/components/rh/employee-overview"
import { EmployeeRequestsTab } from "@/components/rh/employee-requests-tab"
import { KpiCard } from "@/components/rh/kpi-card"
import { StatusPill } from "@/components/rh/status-pill"
import { EMPLOYEE_STATUS_META, ON_LEAVE_META, contractAlerts, contractTypeLabel, formatDate, seniority } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import {
    employeeService,
    type EmployeeStatus,
    type IEmployee,
    type IEmployeeLeave,
    type IHrRequest,
} from "@/lib/api/employee.service"
import { contractService, type IEmployeeContract } from "@/lib/api/contract.service"
import { cn } from "@/lib/utils"

/**
 * Fiche d'un employé et toutes les opérations qui le concernent : modification,
 * changement de statut, contrats, congés, demandes RH, historique.
 */
export function EmployeeDetail({ id }: { id: string }) {
    const router = useRouter()

    const [employee, setEmployee] = useState<IEmployee | null>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [leaves, setLeaves] = useState<IEmployeeLeave[]>([])
    const [requests, setRequests] = useState<IHrRequest[]>([])
    const [contracts, setContracts] = useState<IEmployeeContract[]>([])
    const [operationsLoading, setOperationsLoading] = useState(true)

    const [tab, setTab] = useState("apercu")
    const [editOpen, setEditOpen] = useState(false)
    const [directory, setDirectory] = useState<IEmployee[]>([])
    const [statusTarget, setStatusTarget] = useState<EmployeeStatus | null>(null)
    const [statusSaving, setStatusSaving] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const loadEmployee = useCallback(async () => {
        try {
            setEmployee(await employeeService.get(id))
            setNotFound(false)
            setLoadError(null)
        } catch (err) {
            if ((err as { statusCode?: number })?.statusCode === 404) setNotFound(true)
            else setLoadError(extractApiErrorMessage(err, "Impossible de charger la fiche de cet employé."))
        }
    }, [id])

    const loadOperations = useCallback(async () => {
        try {
            const [leaveList, requestList, contractList] = await Promise.all([
                employeeService.leaves(id),
                employeeService.requests(id),
                contractService.employeeContracts(id),
            ])
            setLeaves(leaveList)
            setRequests(requestList)
            setContracts(contractList)
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "Impossible de charger les contrats, congés et demandes."))
        } finally {
            setOperationsLoading(false)
        }
    }, [id])

    useEffect(() => {
        setLoading(true)
        void Promise.all([loadEmployee(), loadOperations()]).finally(() => setLoading(false))
    }, [loadEmployee, loadOperations])

    /** Après une opération : fiche (synchronisée sur le contrat), solde, compteurs et listes se rechargent. */
    const refresh = useCallback(async () => {
        await Promise.all([loadEmployee(), loadOperations()])
    }, [loadEmployee, loadOperations])

    const contractAlertCount = useMemo(() => (employee ? contractAlerts(contracts, [employee]).length : 0), [contracts, employee])

    const openEdit = async () => {
        setEditOpen(true)
        // La liste sert au choix du responsable ; on la charge à la demande.
        if (directory.length === 0) {
            try {
                setDirectory(await employeeService.list())
            } catch {
                /* le choix du responsable restera vide, la modification reste possible */
            }
        }
    }

    const changeStatus = async () => {
        if (!employee || !statusTarget) return
        setStatusSaving(true)
        try {
            const updated = await employeeService.update(employee.id, { status: statusTarget })
            setEmployee(updated)
            toast.success(`Statut mis à jour : ${EMPLOYEE_STATUS_META[statusTarget].label}.`)
            setStatusTarget(null)
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "Le changement de statut a échoué."))
        } finally {
            setStatusSaving(false)
        }
    }

    const confirmDelete = async () => {
        if (!employee) return
        setDeleting(true)
        try {
            await employeeService.remove(employee.id)
            toast.success(`${employee.fullName} a été retiré du répertoire.`)
            router.push("/services-rh/employes")
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La suppression de l'employé a échoué."))
            setDeleting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (notFound || loadError || !employee) {
        return (
            <div className="mx-auto max-w-md rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center">
                <UserX className="mx-auto h-10 w-10 text-muted-foreground" />
                <h1 className="mt-3 text-lg font-semibold text-foreground">
                    {notFound ? "Employé introuvable" : "Fiche indisponible"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {notFound ? "Cette fiche n'existe pas ou a été supprimée." : loadError}
                </p>
                <div className="mt-5 flex justify-center gap-2">
                    {!notFound && <Button variant="outline" onClick={() => { setLoading(true); void refresh().finally(() => setLoading(false)) }}>Réessayer</Button>}
                    <Button asChild><Link href="/services-rh/employes">Retour aux employés</Link></Button>
                </div>
            </div>
        )
    }

    const balance = employee.leaveBalance
    const openRequests = requests.filter((r) => r.status === "PENDING" || r.status === "IN_PROGRESS").length
    const pendingLeaves = leaves.filter((l) => l.status === "PENDING").length
    const activeContract = employee.activeContract

    return (
        <div className="space-y-5 pb-8">
            <Link href="/services-rh/employes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Employés
            </Link>

            <div className="overflow-hidden rounded-xl border border-border bg-white">
                <div className="h-16 bg-brand-gradient" />
                <div className="px-4 pb-5 sm:px-6">
                    <EmployeeAvatar id={employee.id} firstName={employee.firstName} lastName={employee.lastName} size="lg" className="-mt-8 ring-4 ring-white" />

                    <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <h1 className="text-2xl font-semibold leading-tight text-foreground">{employee.fullName}</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {employee.jobTitle}
                                {employee.department ? ` · ${employee.department}` : ""}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                <StatusPill meta={EMPLOYEE_STATUS_META[employee.status]} />
                                {employee.onLeaveToday && <StatusPill meta={ON_LEAVE_META} />}
                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-foreground">{employee.matricule}</span>
                                <button
                                    type="button"
                                    onClick={() => setTab("contrats")}
                                    className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-secondary hover:text-primary"
                                >
                                    {contractTypeLabel(employee.contractType)}
                                    {activeContract?.endDate ? ` jusqu'au ${formatDate(activeContract.endDate)}` : ""}
                                </button>
                                {employee.source === "CANDIDATURE" && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                                        <Sparkles className="h-3 w-3" />
                                        Embauché via Goriya
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => void openEdit()} className="hover:bg-muted hover:text-foreground">
                                <Pencil className="h-4 w-4" />
                                Modifier
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="hover:bg-muted hover:text-foreground">
                                        Statut
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuLabel>Changer le statut</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {(Object.keys(EMPLOYEE_STATUS_META) as EmployeeStatus[]).map((s) => (
                                        <DropdownMenuItem key={s} disabled={s === employee.status} onSelect={() => setStatusTarget(s)}>
                                            <span className={cn("h-2 w-2 rounded-full", EMPLOYEE_STATUS_META[s].dot)} />
                                            {EMPLOYEE_STATUS_META[s].label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="outline" onClick={() => setDeleteOpen(true)} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                                Supprimer
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard icon={Clock3} label="Ancienneté" value={seniority(employee.hireDate)} />
                <KpiCard
                    icon={Wallet}
                    label={`Solde congés ${balance?.year ?? ""}`.trim()}
                    value={balance ? `${balance.remaining} / ${balance.entitlement} j` : "—"}
                    hint={balance ? `${balance.taken} pris · ${balance.pending} en attente` : undefined}
                />
                <KpiCard icon={CalendarDays} label="Congés en attente" value={String(pendingLeaves)} highlight={pendingLeaves > 0} onClick={() => setTab("conges")} />
                <KpiCard icon={ClipboardList} label="Demandes ouvertes" value={String(openRequests)} highlight={openRequests > 0} onClick={() => setTab("demandes")} />
            </div>

            <Tabs value={tab} onValueChange={setTab}>
                <div className="overflow-x-auto">
                    <TabsList>
                        <TabsTrigger value="apercu">Aperçu</TabsTrigger>
                        <TabsTrigger value="contrats">
                            Contrats
                            {contractAlertCount > 0 && <Counter value={contractAlertCount} />}
                        </TabsTrigger>
                        <TabsTrigger value="conges">
                            Congés
                            {pendingLeaves > 0 && <Counter value={pendingLeaves} />}
                        </TabsTrigger>
                        <TabsTrigger value="demandes">
                            Demandes
                            {openRequests > 0 && <Counter value={openRequests} />}
                        </TabsTrigger>
                        <TabsTrigger value="historique">Historique</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="apercu" className="mt-4">
                    <EmployeeOverview employee={employee} />
                </TabsContent>
                <TabsContent value="contrats" className="mt-4">
                    <EmployeeContractsTab employee={employee} contracts={contracts} loading={operationsLoading} onChanged={refresh} />
                </TabsContent>
                <TabsContent value="conges" className="mt-4">
                    <EmployeeLeavesTab employee={employee} leaves={leaves} loading={operationsLoading} onChanged={refresh} />
                </TabsContent>
                <TabsContent value="demandes" className="mt-4">
                    <EmployeeRequestsTab employee={employee} requests={requests} loading={operationsLoading} onChanged={refresh} />
                </TabsContent>
                <TabsContent value="historique" className="mt-4">
                    <EmployeeHistory employee={employee} leaves={leaves} requests={requests} contracts={contracts} />
                </TabsContent>
            </Tabs>

            <EmployeeFormDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                employee={employee}
                employees={directory}
                onSaved={(saved) => {
                    setEmployee(saved)
                    setDirectory((prev) => prev.map((e) => (e.id === saved.id ? saved : e)))
                }}
            />

            <ConfirmDialog
                open={!!statusTarget}
                onOpenChange={(open) => !open && setStatusTarget(null)}
                title={statusTarget ? `Passer ${employee.fullName} en « ${EMPLOYEE_STATUS_META[statusTarget].label} » ?` : ""}
                description={
                    statusTarget === "TERMINATED"
                        ? "L'employé ne pourra plus poser de congé. Sa fiche, son historique et ses demandes restent consultables, et une attestation peut toujours lui être délivrée. Pensez à clôturer ou rompre son contrat en vigueur depuis l'onglet Contrats."
                        : "Le nouveau statut s'affiche immédiatement dans le répertoire."
                }
                confirmLabel="Confirmer"
                destructive={statusTarget === "TERMINATED"}
                loading={statusSaving}
                onConfirm={changeStatus}
            />

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={`Supprimer ${employee.fullName} ?`}
                description="Sa fiche, ses contrats (documents signés compris), ses congés et ses demandes RH seront définitivement supprimés. Pour un départ, préférez le statut « Parti » : l'historique reste consultable."
                confirmLabel="Supprimer"
                destructive
                loading={deleting}
                onConfirm={confirmDelete}
            />
        </div>
    )
}

function Counter({ value }: { value: number }) {
    return <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">{value}</span>
}
