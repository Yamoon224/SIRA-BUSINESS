import Link from "next/link"
import { GoriyaLogo } from "@/components/goriya-logo"

export function SiteFooter() {
    return (
        <footer className="bg-white py-10">
            <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 md:flex-row md:px-6">
                <GoriyaLogo showTagline={true} />
                <nav className="flex items-center gap-6 text-sm text-[#5B6472]">
                    <Link href="/#comment-ca-marche" className="hover:text-[#0B1220] transition-colors">Comment ça marche</Link>
                    <Link href="/tarification" className="hover:text-[#0B1220] transition-colors">Tarifs</Link>
                    <Link href="/assistance" className="hover:text-[#0B1220] transition-colors">Assistance</Link>
                </nav>
                <p className="text-xs text-[#8891ab]">
                    © {new Date().getFullYear()} Goriya — Recrutement pour l&apos;Afrique de l&apos;Ouest.
                </p>
            </div>
        </footer>
    )
}
