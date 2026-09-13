import { Check, X } from "lucide-react"
import { ENTERPRISE_PLAN_FEATURE_MATRIX, type PlanFeatureRow } from "@/lib/pricing-feature-matrix"

interface PlanFeatureListProps {
    /** Doit correspondre à `SubscriptionPlan.name` ("Business" | "Business+") ou "Sur Mesure". */
    planName: string
    className?: string
}

/**
 * Liste complète des fonctionnalités de la grille tarifaire (voir
 * lib/pricing-feature-matrix.ts), une ligne par fonctionnalité - cochée en
 * vert si incluse dans `planName`, barrée d'une croix rouge sinon. Remplace
 * l'ancienne liste `plan.features` (qui n'affichait que les fonctionnalités
 * incluses, sans comparaison entre forfaits).
 */
export function PlanFeatureList({ planName, className }: PlanFeatureListProps) {
    const rows: PlanFeatureRow[] = ENTERPRISE_PLAN_FEATURE_MATRIX

    return (
        <ul className={className ?? "space-y-2.5"}>
            {rows.map((row) => {
                const value = row.values[planName as keyof PlanFeatureRow["values"]] ?? false
                const included = value !== false

                return (
                    <li
                        key={row.label}
                        className={`flex items-start gap-2 text-[13px] leading-snug ${
                            included ? "text-[#4e5a6e]" : "text-[#b7bdc9]"
                        }`}
                    >
                        {included ? (
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                        ) : (
                            <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                        )}
                        <span>
                            {row.label}
                            {typeof value === "string" && <span className="text-[#8891ab]"> - {value}</span>}
                        </span>
                    </li>
                )
            })}
        </ul>
    )
}
