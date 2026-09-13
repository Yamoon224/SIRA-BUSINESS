import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type PageHeaderProps = {
    title: ReactNode
    /** Sous-titre : dit à quoi sert la page, sous le titre. */
    description?: ReactNode
    /** Actions rangées à droite du titre (sous le titre sur mobile). */
    actions?: ReactNode
    className?: string
}

/**
 * En-tête des pages de l'espace entreprise : titre, sous-titre et actions,
 * soulignés d'un filet. Chaque page déclarait son titre à sa façon - tailles
 * différentes, sous-titre présent ou absent, espacement variable - d'où ce
 * composant unique, calqué sur celui de l'espace candidat.
 *
 * L'espace SOUS le filet appartient à ce composant : ne le remplacez pas
 * depuis une page, sinon le contenu se retrouve collé au trait sur cette page
 * et pas sur les autres.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
    return (
        <div
            className={cn(
                "mb-6 flex flex-col gap-3 border-b border-border pb-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between",
                className,
            )}
        >
            <div className="min-w-0">
                <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{title}</h1>
                {description ? (
                    <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                ) : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    )
}
