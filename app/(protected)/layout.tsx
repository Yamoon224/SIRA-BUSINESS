"use client"

import { useEffect } from "react"
import { SessionProvider, useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, useSidebar } from "@/components/sidebar-context"

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        // refetchInterval : force le passage régulier dans le callback `jwt`
        // (côté route /api/auth/session, seul endroit où le cookie est réécrit)
        // pour que le token backend soit tourné avant son expiration à 60 min.
        <SessionProvider refetchInterval={20 * 60} refetchOnWindowFocus>
            <SidebarProvider>
                <AuthGuard>{children}</AuthGuard>
            </SidebarProvider>
        </SessionProvider>
    )
}

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/auth/signin")
        }
    }, [status, router])

    // Le rafraîchissement du token backend a échoué (session trop ancienne) :
    // on déconnecte proprement plutôt que de laisser l'app enchaîner les 401.
    useEffect(() => {
        if (session?.error === "RefreshAccessTokenError") {
            signOut({ callbackUrl: "/auth/signin" })
        }
    }, [session?.error])

    if (status === "loading" || status === "unauthenticated") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
        )
    }

    return <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
}

function ProtectedLayoutContent({ children }: { children: React.ReactNode }) {
    const { open, setOpen } = useSidebar()

    return (
        <div className="min-h-screen flex bg-background overflow-x-hidden">
            <AppSidebar />

            {open && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 md:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* `min-w-0` : sans lui, cet enfant de flex garde la largeur de son
                contenu le plus large (ex. le tableau de bord Recrutements et
                son pipeline en colonnes) au lieu de se limiter à l'espace
                disponible. Le `overflow-x-hidden` du conteneur ne faisait que
                masquer le débordement en silence : la page se rendait bien à
                1220px de large en interne, simplement rognée à la largeur de
                l'écran - plus de la moitié du contenu restait invisible sur
                mobile plutôt que de défiler. */}
            <div className="min-w-0 flex-1 flex flex-col md:ml-64 h-screen">
                <AppHeader />
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}