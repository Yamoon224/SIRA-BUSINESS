"use client"

import { useMemo, type ReactNode } from "react"
import { CheckCircle2, FilePen, FilePlus2, FileSignature, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContractActionsMenu, useContractWorkflow } from "@/components/rh/contract-actions"
import { ContractAlertList } from "@/components/rh/contract-alerts"
import { StatusPill } from "@/components/rh/status-pill"
import {
    CONTRACT_KIND_META,
    CONTRACT_STATUS_META,
    FIXED_TERM_CONTRACT_TYPES,
    contractAlerts,
    contractPeriod,
    contractTypeLabel,
    formatDate,
    formatFcfa,
} from "@/lib/data/rh"
import type { IEmployeeContract } from "@/lib/api/contract.service"
import type { IEmployee } from "@/lib/api/employee.service"
import { cn } from "@/lib/utils"

interface EmployeeContractsTabProps {
    employee: IEmployee
    contracts: IEmployeeContract[]
    loading: boolean
    onChanged: () => Promise<void> | void
}

/** Onglet « Contrats » de la fiche : historique, échéances et toutes les opérations. */
export function EmployeeContractsTab({ employee, contracts, loading, onChanged }: EmployeeContractsTabProps) {
    const workflow = useContractWorkflow({ onChanged, employee, contracts })
    const active = contracts.find((c) => c.status === "ACTIVE") ?? null
    const alerts = useMemo(() => contractAlerts(contracts, [employee]), [contracts, employee])
    const departed = employee.status === "TERMINATED"

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">Contrats</h2>
                <div className="flex flex-wrap gap-2">
                    {active ? (
                        <>
                            {FIXED_TERM_CONTRACT_TYPES.includes(active.type) && (
                                <Button variant="outline" onClick={() => workflow.renew(active)} className="hover:bg-muted hover:text-foreground">
                                    <RefreshCw className="h-4 w-4" />
                                    Renouveler
                                </Button>
                            )}
                            <Button onClick={() => workflow.amend(active)}>
                                <FilePen className="h-4 w-4" />
                                Établir un avenant
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={() => workflow.openCreate({ mode: { kind: "INITIAL", fromHireDate: contracts.length === 0 } })}
                            disabled={departed}
                            title={departed ? "L'employé a quitté l'entreprise" : undefined}
                        >
                            <FilePlus2 className="h-4 w-4" />
                            Nouveau contrat
                        </Button>
                    )}
                </div>
            </div>

            {!loading && alerts.length > 0 && <ContractAlertList alerts={alerts} workflow={workflow} />}

            {loading ? (
                <div className="space-y-2" aria-busy="true">
                    {[0, 1].map((i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />)}
                </div>
            ) : contracts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center">
                    <FileSignature className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Aucun contrat enregistré pour {employee.firstName}.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {contracts.map((contract) => (
                        <li
                            key={contract.id}
                            className={cn(
                                "rounded-xl border bg-white p-4",
                                contract.status === "ACTIVE" ? "border-green-300 ring-1 ring-green-100" : "border-border",
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-foreground">
                                            {contractTypeLabel(contract.type)} · {contract.jobTitle}
                                        </p>
                                        <StatusPill meta={CONTRACT_STATUS_META[contract.status]} />
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {contract.reference} · {CONTRACT_KIND_META[contract.kind].label}
                                        {contract.parent ? ` de ${contract.parent.reference}` : ""}
                                    </p>
                                </div>
                                <ContractActionsMenu contract={contract} workflow={workflow} />
                            </div>

                            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3 text-sm sm:grid-cols-4">
                                <Term label="Période" className="col-span-2">{contractPeriod(contract)}</Term>
                                <Term label="Fin d'essai">{contract.trialEndDate ? formatDate(contract.trialEndDate) : "—"}</Term>
                                <Term label="Salaire brut">{formatFcfa(contract.salary)}</Term>
                                <Term label="Durée hebdomadaire">{contract.weeklyHours ? `${contract.weeklyHours} h` : "—"}</Term>
                                <Term label="Signature">
                                    {contract.signedAt ? `Le ${formatDate(contract.signedAt)}` : <span className="text-amber-700">Non signé</span>}
                                </Term>
                                <Term label="Document" className="col-span-2">
                                    {contract.document ? (
                                        <button
                                            type="button"
                                            onClick={() => void workflow.download(contract)}
                                            disabled={workflow.busyId === contract.id}
                                            className="max-w-full truncate text-left text-primary hover:underline disabled:opacity-60"
                                        >
                                            {contract.document.name}
                                        </button>
                                    ) : (
                                        <button type="button" onClick={() => workflow.requestUpload(contract)} className="text-primary hover:underline">
                                            Joindre le contrat signé
                                        </button>
                                    )}
                                </Term>
                            </dl>

                            {contract.status === "TERMINATED" && (
                                <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                                    Rompu le {formatDate(contract.terminationDate)}
                                    {contract.terminationReason ? ` — ${contract.terminationReason}` : ""}
                                </p>
                            )}
                            {contract.notes && <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{contract.notes}</p>}

                            {contract.status === "DRAFT" && (
                                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                                    <Button size="sm" onClick={() => workflow.requestActivate(contract)}>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Mettre en vigueur
                                    </Button>
                                    <span className="text-xs text-muted-foreground">Brouillon : modifiable librement, sans effet sur la fiche.</span>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {workflow.dialogs}
        </div>
    )
}

function Term({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
    return (
        <div className={cn("min-w-0", className)}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 min-w-0 text-foreground">{children}</dd>
        </div>
    )
}
