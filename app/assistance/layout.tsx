"use client"

import { SessionProvider } from "next-auth/react"

/**
 * Le centre d'assistance est une page publique, mais elle est aussi liée depuis
 * la barre latérale d'une entreprise connectée. Ce SessionProvider permet à
 * l'en-tête et au pied de page d'adapter leurs liens au contexte plutôt que de
 * toujours renvoyer vers la landing publique.
 */
export default function AssistanceLayout({ children }: { children: React.ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>
}
