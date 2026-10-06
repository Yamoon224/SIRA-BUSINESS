"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { initials } from "@/lib/data/rh"

/**
 * Teintes des pastilles d'initiales. La couleur dépend de l'identifiant, pas
 * du nom : un employé garde la même teinte d'une page à l'autre, même renommé.
 */
const PALETTE = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
    "bg-indigo-100 text-indigo-700",
    "bg-orange-100 text-orange-700",
]

function hueFor(seed: string): string {
    let hash = 0
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
    return PALETTE[Math.abs(hash) % PALETTE.length]
}

const SIZES = {
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-xl",
} as const

interface EmployeeAvatarProps {
    id: string
    firstName?: string | null
    lastName?: string | null
    /** Photo du compte Goriya lié (voir EmployeeResource::avatar) — absente pour une fiche manuelle. */
    avatar?: string | null
    size?: keyof typeof SIZES
    className?: string
}

export function EmployeeAvatar({ id, firstName, lastName, avatar, size = "md", className }: EmployeeAvatarProps) {
    const [failed, setFailed] = useState(false)

    if (avatar && !failed) {
        return (
            <div className={cn("shrink-0 overflow-hidden rounded-full bg-muted", SIZES[size], className)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={avatar}
                    alt={[firstName, lastName].filter(Boolean).join(" ") || "Employé"}
                    className="h-full w-full object-cover"
                    onError={() => setFailed(true)}
                />
            </div>
        )
    }

    return (
        <div
            aria-hidden="true"
            className={cn(
                "flex shrink-0 items-center justify-center rounded-full font-semibold",
                SIZES[size],
                hueFor(id),
                className,
            )}
        >
            {initials(firstName, lastName)}
        </div>
    )
}
