import type { ComponentType } from "react"
import { Ban, Briefcase, CalendarCheck, CalendarDays, ClipboardCheck, ClipboardList, FileCheck2, FileSignature, Sparkles, UserPlus } from "lucide-react"
import {
    CONTRACT_KIND_META,
    HR_REQUEST_TYPE_META,
    LEAVE_TYPE_META,
    WORKFLOW_STATUS_META,
    contractTypeLabel,
    formatDate,
    formatFcfa,
    parseLocalDate,
} from "@/lib/data/rh"
import type { IEmployee, IEmployeeLeave, IHrRequest } from "@/lib/api/employee.service"
import type { IEmployeeContract } from "@/lib/api/contract.service"
import { cn } from "@/lib/utils"

type HistoryEvent = {
    key: string
    date: string
    title: string
    detail?: string
    icon: ComponentType<{ className?: string }>
    tone: string
}

interface EmployeeHistoryProps {
    employee: IEmployee
    leaves: IEmployeeLeave[]
    requests: IHrRequest[]
    contracts?: IEmployeeContract[]
}

/**
 * Onglet « Historique » : chronologie reconstituée à partir de la fiche, des
 * contrats, des congés et des demandes déjà chargés — aucun appel supplémentaire.
 */
export function EmployeeHistory({ employee, leaves, requests, contracts = [] }: EmployeeHistoryProps) {
    const events: HistoryEvent[] = [
        {
            key: "created",
            date: employee.createdAt,
            title: employee.source === "CANDIDATURE" ? "Embauché via une candidature Goriya" : "Fiche créée",
            detail: employee.source === "CANDIDATURE" ? employee.hiredFrom?.jobOfferTitle ?? undefined : undefined,
            icon: employee.source === "CANDIDATURE" ? Sparkles : UserPlus,
            tone: "bg-secondary text-primary",
        },
    ]

    // La prise de poste se lit sur le contrat initial quand il existe.
    if (contracts.length === 0) {
        events.push({
            key: "hired",
            date: employee.hireDate,
            title: "Prise de poste",
            detail: `${employee.jobTitle} · ${contractTypeLabel(employee.contractType)}`,
            icon: Briefcase,
            tone: "bg-secondary text-primary",
        })
    }

    for (const contract of contracts) {
        const label = `${CONTRACT_KIND_META[contract.kind].label} ${contract.reference}`
        if (contract.status === "DRAFT") {
            events.push({
                key: `contract-draft-${contract.id}`,
                date: contract.createdAt,
                title: `${label} préparé (brouillon)`,
                detail: `${contractTypeLabel(contract.type)} · ${contract.jobTitle}`,
                icon: FileSignature,
                tone: "bg-muted text-muted-foreground",
            })
            continue
        }
        events.push({
            key: `contract-start-${contract.id}`,
            date: contract.startDate,
            title: `${label} : prise d'effet`,
            detail: [contractTypeLabel(contract.type), contract.jobTitle, contract.salary !== null ? formatFcfa(contract.salary) : null].filter(Boolean).join(" · "),
            icon: FileSignature,
            tone: "bg-green-100 text-green-700",
        })
        if (contract.status === "ENDED" && contract.endDate) {
            events.push({
                key: `contract-end-${contract.id}`,
                date: contract.endDate,
                title: `Fin du contrat ${contract.reference}`,
                icon: FileCheck2,
                tone: "bg-slate-100 text-slate-600",
            })
        }
        if (contract.status === "TERMINATED" && contract.terminationDate) {
            events.push({
                key: `contract-termination-${contract.id}`,
                date: contract.terminationDate,
                title: `Rupture du contrat ${contract.reference}`,
                detail: contract.terminationReason ?? undefined,
                icon: Ban,
                tone: "bg-red-100 text-red-700",
            })
        }
    }

    for (const leave of leaves) {
        const label = LEAVE_TYPE_META[leave.type]?.label ?? leave.type
        events.push({
            key: `leave-${leave.id}`,
            date: leave.createdAt,
            title: `Congé posé : ${label}`,
            detail: `Du ${formatDate(leave.startDate)} au ${formatDate(leave.endDate)} · ${leave.days} j`,
            icon: CalendarDays,
            tone: "bg-amber-100 text-amber-700",
        })
        if (leave.decidedAt) {
            events.push({
                key: `leave-decision-${leave.id}`,
                date: leave.decidedAt,
                title: `${label} : ${WORKFLOW_STATUS_META[leave.status].label.toLowerCase()}`,
                detail: [leave.decidedByName && `par ${leave.decidedByName}`, leave.decisionComment && `« ${leave.decisionComment} »`].filter(Boolean).join(" — ") || undefined,
                icon: CalendarCheck,
                tone: WORKFLOW_STATUS_META[leave.status].className,
            })
        }
    }

    for (const request of requests) {
        events.push({
            key: `request-${request.id}`,
            date: request.createdAt,
            title: `Demande : ${HR_REQUEST_TYPE_META[request.type]?.label ?? request.type}`,
            detail: request.subject,
            icon: ClipboardList,
            tone: "bg-blue-100 text-blue-700",
        })
        if (request.decidedAt) {
            events.push({
                key: `request-decision-${request.id}`,
                date: request.decidedAt,
                title: `${request.subject} : ${WORKFLOW_STATUS_META[request.status].label.toLowerCase()}`,
                detail: [request.decidedByName && `par ${request.decidedByName}`, request.decisionComment && `« ${request.decisionComment} »`].filter(Boolean).join(" — ") || undefined,
                icon: ClipboardCheck,
                tone: WORKFLOW_STATUS_META[request.status].className,
            })
        }
    }

    const time = (value: string) => parseLocalDate(value)?.getTime() ?? 0
    events.sort((a, b) => time(b.date) - time(a.date))

    return (
        <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <ol className="relative space-y-5 border-l border-border pl-6">
                {events.map((event) => (
                    <li key={event.key} className="relative">
                        <span className={cn("absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white", event.tone)}>
                            <event.icon className="h-3.5 w-3.5" />
                        </span>
                        <p className="text-xs text-muted-foreground">{formatDate(event.date, { day: "numeric", month: "long", year: "numeric" })}</p>
                        <p className="text-sm font-medium text-foreground">{event.title}</p>
                        {event.detail && <p className="text-sm text-muted-foreground">{event.detail}</p>}
                    </li>
                ))}
            </ol>
        </section>
    )
}
