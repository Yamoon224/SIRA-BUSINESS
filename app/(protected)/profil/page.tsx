import Link from "next/link"
import { redirect } from "next/navigation"
import Content from "./content"
import { findCompany } from "@/actions/companies"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"

/**
 * Profil entreprise. La route est bien `/profil` (le menu utilisateur poussait
 * `/profile`, d'où le 404 — voir components/user-menu.tsx).
 */
export default async function Page() {
    const session = await getServerSession(authOptions)

    // Non authentifié : on renvoie vers la connexion avec un retour sur cette
    // page, au lieu d'afficher un paragraphe sans issue.
    if (!session?.user?.access_token) {
        redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/profil")}`)
    }

    if (!session.user.companyId) {
        return <ProfilError message="Votre compte n'est rattaché à aucune entreprise. Contactez le support pour rétablir le rattachement." />
    }

    try {
        const company = await findCompany(session.user.companyId, session.user.access_token)
        return <Content company={company} />
    } catch (err) {
        console.error("Erreur fetch company:", err)
        return <ProfilError message="Impossible de récupérer les informations de l'entreprise pour le moment. Réessayez dans un instant." />
    }
}

function ProfilError({ message }: { message: string }) {
    return (
        <div className="mx-auto flex min-h-[300px] max-w-md flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">{message}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild variant="outline" className="rounded-full">
                    <Link href="/dashboard">Retour au tableau de bord</Link>
                </Button>
                <Button asChild className="rounded-full">
                    <Link href="/assistance">Contacter l&apos;assistance</Link>
                </Button>
            </div>
        </div>
    )
}
