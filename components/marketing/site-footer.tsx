import Link from "next/link"
import { GoriyaLogo } from "@/components/goriya-logo"

const footerLinks = [
    { href: "/#comment-ca-marche", label: "Comment ça marche" },
    { href: "/#services-rh", label: "Services RH" },
    { href: "/tarification", label: "Tarifs" },
    { href: "/assistance", label: "Assistance" },
]

export function SiteFooter() {
    return (
        <footer className="bg-white py-4">
            {/* Trois blocs côte à côte seulement en `lg` : en `md`, ils se
                partageaient une largeur trop courte et les liens passaient à la ligne. */}
            <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 md:px-6 lg:flex-row">
                <GoriyaLogo showTagline={true} />
                {/* Chaque lien tient sur une ligne ; sur un écran étroit, ce sont
                    les liens entiers qui passent à la ligne suivante. */}
                <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#5B6472]">
                    {footerLinks.map((link) => (
                        <Link key={link.href} href={link.href} className="whitespace-nowrap transition-colors hover:text-[#0B1220]">
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <p className="text-center text-xs text-[#8891ab]">
                    © {new Date().getFullYear()} Goriya - Recrutement pour l&apos;Afrique de l&apos;Ouest.
                </p>
            </div>
        </footer>
    )
}
