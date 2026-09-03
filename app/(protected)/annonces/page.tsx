import { Content } from "./content"
import { getJobOffers } from "@/actions/offers"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { IPaginatedResponse, IOffer } from "@/@types/interface"
import { SubscriptionGate } from "@/components/subscription-gate"


export default async function Page() {
    const session = await getServerSession(authOptions)

    if (!session?.user?.access_token) return <p>Vous devez être connecté</p>

    const token = session.user.access_token
    // Filtrer sur l'entreprise connectée : sans `companyId`, /job-offers/paginate
    // renvoie les offres de toutes les entreprises — y compris, depuis l'ajout
    // des brouillons, des annonces non publiées qui ne regardent que leur auteur.
    const filters = { page: 1, limit: 10, companyId: session.user.companyId }

    let init: IPaginatedResponse<IOffer> = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
    try {
        init = await getJobOffers(filters, token)
    } catch (err) {
        console.error("Erreur fetch job offers:", err)
        return <p>Impossible de récupérer les annonces pour le moment. Réessaie plus tard.</p>
    }

    return (
        <SubscriptionGate featureLabel="la gestion des annonces">
            <Content init={init} />
        </SubscriptionGate>
    )
}