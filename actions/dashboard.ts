import { apiRequest } from "@/lib/api-client-http"
import { DashboardContentProps } from "@/@types/props"
import { DashboardStatsParams } from "@/@types/interface"

export const stats = async (token: string, params?: DashboardStatsParams) => {
    try {
        return await apiRequest<DashboardContentProps>({
            endpoint: `/dashboard/stats`,
            method: "GET",
            params: params, // start et end seront ajoutés à l'URL
            token: token,
        })
    } catch (err) {
        console.error("Erreur fetch stats:", err)
        throw err
    }
}

/** Carte « Recommandations IA du jour » — calculées sur les vraies statistiques de l'entreprise. */
export const getRecommendations = () =>
    apiRequest<{ items: string[] }>({ endpoint: "/dashboard/recommendations", method: "GET" })