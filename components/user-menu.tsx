"use client"

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";

interface UserMenuProps {
    /**
     * "header"  : avatar seul, cliquable, avec le menu des actions de compte.
     *             L'en-tête n'affiche plus ni nom ni e-mail — ils n'y servaient
     *             qu'à répéter ce que la barre latérale montre déjà.
     * "sidebar" : identité affichée en bas de la barre latérale, sans menu.
     */
    variant?: "header" | "sidebar";
}

export default function UserMenu({ variant = "header" }: UserMenuProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const { data: session, status } = useSession();
    const user = session?.user;

    // Fermer le dropdown si clic en dehors
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            // 🧹 Nettoyage défensif d'éventuels résidus d'anciennes sessions
            // (localStorage/cookie "auth" non httpOnly utilisés par le passé).
            if (typeof window !== "undefined") {
                localStorage.removeItem("auth");
                localStorage.removeItem("user");
                document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            }

            await signOut({ redirect: false });
            router.push("/auth/signin");
        } catch (err) {
            console.error(err);
        }
    };

    if (status === "loading" || !user) return null;

    const initiales = user.name?.slice(0, 2).toUpperCase() || "UN";

    if (variant === "sidebar") {
        return (
            <div className="flex items-center gap-3 border-t border-border p-4">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.image || "/placeholder-user.jpg"} />
                    <AvatarFallback>{initiales}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={menuRef} className="relative">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Menu du compte"
                onClick={() => setOpen(!open)}
                className="flex items-center rounded-full transition-opacity outline-none hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/50">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.image || "/placeholder-user.jpg"} />
                    <AvatarFallback>{initiales}</AvatarFallback>
                </Avatar>
            </button>

            {/* Profil entreprise et Paramètres ont été retirés d'ici : les deux
                sont déjà dans la barre latérale, où l'on va les chercher. Ne
                reste que la déconnexion, qui n'a pas d'autre point d'accès. */}
            {open && (
                <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-sm border bg-background py-1 shadow-lg">
                    <button
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-500 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                        <LogOut className="h-4 w-4" /> Déconnexion
                    </button>
                </div>
            )}
        </div>
    );
}
