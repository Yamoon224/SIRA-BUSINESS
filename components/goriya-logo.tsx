"use client"

import Link from "next/link"
import Image from "next/image"

interface GoriyaLogoProps {
    className?: string
    showTagline?: boolean
    width?: number
    height?: number
    /**
     * "default" : logo dégradé posé directement sur un fond clair.
     * "onDark"  : même logo dégradé, sur une pastille claire qui lui rend son
     *             contraste au-dessus d'une surface bleue ou sombre.
     *
     * "white" est conservé comme alias de "onDark" pour les appels existants :
     * le logo est en dégradé par nature, le remplacer par un aplat blanc lui
     * ferait perdre son identité.
     */
    variant?: "default" | "onDark" | "white"
    /**
     * Destination du clic sur le logo. Par défaut la page d'accueil publique ;
     * dans l'espace entreprise connecté, on passe "/dashboard" pour ne pas
     * éjecter l'utilisateur vers la landing marketing.
     */
    href?: string
    /** Libellé accessible du lien, aligné sur la destination. */
    ariaLabel?: string
}

export function GoriyaLogo({
    className = "",
    showTagline = true,
    width = 120,
    height = 40,
    variant = "default",
    href = "/",
    ariaLabel,
}: GoriyaLogoProps) {
    const surDark = variant === "onDark" || variant === "white"

    return (
        <Link
            href={href}
            aria-label={ariaLabel ?? (href === "/" ? "Goriya - accueil" : "Goriya - mon espace")}
            className={`flex w-fit items-center gap-2 ${className}`}
        >
            <Image
                src={variant === "onDark" ? "/images/logo-white.png" : "/images/logo.png"}
                alt="Goriya"
                width={width}
                height={height}
                className="h-10 w-auto"
                priority
            />
        </Link>
    )
}