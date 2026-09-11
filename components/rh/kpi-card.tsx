import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

interface KpiCardProps {
    icon: ComponentType<{ className?: string }>
    label: string
    value: string | number
    hint?: string
    /** Situation à traiter : pastille orange. */
    highlight?: boolean
    /** Rend la carte cliquable (ouvre l'onglet ou le filtre concerné). */
    onClick?: () => void
}

/** Indicateur des pages Services RH : libellé, valeur, pastille d'icône. */
export function KpiCard({ icon: Icon, label, value, hint, highlight, onClick }: KpiCardProps) {
    const Tag = onClick ? "button" : "div"
    return (
        <Tag
            {...(onClick ? { type: "button" as const, onClick } : {})}
            className={cn(
                "rounded-xl border border-border bg-white p-4 text-left",
                onClick && "transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", highlight ? "bg-amber-100 text-amber-700" : "bg-secondary text-primary")}>
                    <Icon className="h-4 w-4" />
                </span>
            </div>
            <p className={cn("mt-2 font-semibold text-foreground", typeof value === "number" ? "text-2xl tabular-nums" : "text-lg")}>{value}</p>
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </Tag>
    )
}
