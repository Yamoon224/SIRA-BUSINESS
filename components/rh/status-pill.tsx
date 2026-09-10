import { cn } from "@/lib/utils"
import type { StatusMeta } from "@/lib/data/rh"

/** Pastille de statut des Services RH (employé, congé, demande). */
export function StatusPill({ meta, className }: { meta: StatusMeta; className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                meta.className,
                className,
            )}
        >
            {meta.label}
        </span>
    )
}
