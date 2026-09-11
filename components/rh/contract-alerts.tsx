"use client"

import type { ComponentType } from "react"
import Link from "next/link"
import { AlertTriangle, CalendarClock, FileText, FileWarning, Hourglass, RefreshCw, Upload, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ContractWorkflow } from "@/components/rh/contract-actions"
import { formatDate, type ContractAlert, type ContractAlertKind } from "@/lib/data/rh"
import { cn } from "@/lib/utils"

const META: Record<ContractAlertKind, { icon: ComponentType<{ className?: string }>; className: string; iconClassName: string }> = {
    EXPIRED: { icon: AlertTriangle, className: "border-red-200 bg-red-50/70", iconClassName: "bg-red-100 text-red-700" },
    NO_CONTRACT: { icon: UserX, className: "border-red-200 bg-red-50/70", iconClassName: "bg-red-100 text-red-700" },
    ENDING_SOON: { icon: CalendarClock, className: "border-amber-200 bg-amber-50/70", iconClassName: "bg-amber-100 text-amber-700" },
    TRIAL_ENDING: { icon: Hourglass, className: "border-blue-200 bg-blue-50/60", iconClassName: "bg-blue-100 text-blue-700" },
    UNSIGNED: { icon: FileWarning, className: "border-border bg-white", iconClassName: "bg-muted text-muted-foreground" },
}

const days = (n: number) => `${n} jour${n > 1 ? "s" : ""}`

function describe(alert: ContractAlert): { title: string; detail: string } {
    const reference = alert.contract?.reference ?? ""
    const n = alert.days ?? 0
    switch (alert.kind) {
        case "EXPIRED":
            return { title: `Contrat ${reference} échu depuis ${days(n)}`, detail: `Fin prévue le ${formatDate(alert.date)} : à renouveler ou à clôturer.` }
        case "ENDING_SOON":
            return {
                title: n === 0 ? `Le contrat ${reference} se termine aujourd'hui` : `Le contrat ${reference} se termine dans ${days(n)}`,
                detail: `Fin le ${formatDate(alert.date)}.`,
            }
        case "TRIAL_ENDING":
            return {
                title: n === 0 ? "La période d'essai se termine aujourd'hui" : `Fin de période d'essai dans ${days(n)}`,
                detail: `Contrat ${reference}, le ${formatDate(alert.date)} : confirmez l'embauche ou mettez fin à l'essai.`,
            }
        case "UNSIGNED":
            return { title: `Le contrat ${reference} n'est pas signé`, detail: "Ni date de signature ni document joint." }
        case "NO_CONTRACT":
            return { title: "Aucun contrat en vigueur", detail: "Formalisez son contrat pour en suivre les échéances." }
    }
}

interface ContractAlertListProps {
    alerts: ContractAlert[]
    workflow: ContractWorkflow
    /** Page Contrats : nom de l'employé et lien vers sa fiche en tête de chaque alerte. */
    showEmployee?: boolean
}

/** Situations à traiter sur les contrats, chacune avec l'action qui la règle. */
export function ContractAlertList({ alerts, workflow, showEmployee = false }: ContractAlertListProps) {
    return (
        <ul className="space-y-2">
            {alerts.map((alert) => {
                const meta = META[alert.kind]
                const { title, detail } = describe(alert)
                const contract = alert.contract
                return (
                    <li key={alert.key} className={cn("flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between", meta.className)}>
                        <div className="flex min-w-0 items-start gap-3">
                            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.iconClassName)}>
                                <meta.icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                    {showEmployee && (
                                        <>
                                            <Link href={`/services-rh/employes/${alert.employeeId}`} className="font-semibold hover:underline">
                                                {alert.employeeName}
                                            </Link>
                                            {" · "}
                                        </>
                                    )}
                                    {title}
                                </p>
                                <p className="text-xs text-muted-foreground">{detail}</p>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                            {(alert.kind === "EXPIRED" || alert.kind === "ENDING_SOON") && contract && (
                                <Button size="sm" variant="outline" onClick={() => workflow.renew(contract)} className="bg-white hover:bg-muted hover:text-foreground">
                                    <RefreshCw className="h-4 w-4" />
                                    Renouveler
                                </Button>
                            )}
                            {alert.kind === "EXPIRED" && contract && (
                                <Button size="sm" variant="outline" onClick={() => workflow.requestEnd(contract)} className="bg-white hover:bg-muted hover:text-foreground">
                                    Clôturer
                                </Button>
                            )}
                            {alert.kind === "UNSIGNED" && contract && (
                                <>
                                    <Button size="sm" variant="outline" disabled={workflow.busyId === contract.id} onClick={() => workflow.requestUpload(contract)} className="bg-white hover:bg-muted hover:text-foreground">
                                        <Upload className="h-4 w-4" />
                                        Joindre le contrat signé
                                    </Button>
                                    <Button size="sm" variant="ghost" disabled={workflow.busyId === contract.id} onClick={() => void workflow.downloadDraft(contract)} className="hover:bg-muted hover:text-foreground">
                                        <FileText className="h-4 w-4" />
                                        Projet .docx
                                    </Button>
                                </>
                            )}
                            {alert.kind === "NO_CONTRACT" && (
                                <Button
                                    size="sm"
                                    onClick={() => workflow.openCreate({ employeeId: alert.employeeId, mode: { kind: "INITIAL", fromHireDate: !alert.hasHistory } })}
                                >
                                    Formaliser le contrat
                                </Button>
                            )}
                            {alert.kind === "TRIAL_ENDING" && showEmployee && (
                                <Button size="sm" variant="outline" asChild className="bg-white hover:bg-muted hover:text-foreground">
                                    <Link href={`/services-rh/employes/${alert.employeeId}`}>Voir la fiche</Link>
                                </Button>
                            )}
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}
