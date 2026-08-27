"use client"

import Link from "next/link"
import Image from "next/image"

interface GoriyaLogoProps {
    className?: string
    showTagline?: boolean
    width?: number
    height?: number
    variant?: "default" | "white"
}

export function GoriyaLogo({
    className = "",
    showTagline = true,
    width = 120,
    height = 40,
    variant = "default",
}: GoriyaLogoProps) {
    return (
        <Link href="/" className={`flex items-center gap-2 ${className}`}>
            <Image
                src={variant === "white" ? "/images/logo-white.png" : "/images/logo.png"}
                alt="Goriya"
                width={width}
                height={height}
                className="h-10 w-auto"
                priority
            />
        </Link>
    )
}