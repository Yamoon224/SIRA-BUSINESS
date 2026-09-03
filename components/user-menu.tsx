"use client"

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, LogOut, Settings } from "lucide-react";

interface UserMenuProps {
    triggerOnly?: boolean; // si true, n'affiche que le trigger, jamais le dropdown
}

export default function UserMenu({ triggerOnly = false }: UserMenuProps) {
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

    return (
        <div ref={menuRef} className="relative border-t border-border p-4">
            {/* Trigger cliquable */}
            <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => !triggerOnly && setOpen(!open)}>
                <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.image || "/placeholder-user.jpg"} />
                    <AvatarFallback>{user.name?.slice(0, 2).toUpperCase() || "UN"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate">
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
            </div>

            {/* Dropdown, uniquement si triggerOnly === false */}
            {!triggerOnly && open && (
                <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border bg-background py-1 shadow-lg">
                    {/* La route est /profil (français), comme app/(protected)/profil :
                        pousser "/profile" renvoyait un 404. */}
                    <button
                        role="menuitem"
                        onClick={() => {
                            setOpen(false)
                            router.push("/profil")
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                        <User className="h-4 w-4" /> Profil entreprise
                    </button>

                    <button
                        role="menuitem"
                        onClick={() => {
                            setOpen(false)
                            router.push("/parametres")
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                        <Settings className="h-4 w-4" /> Paramètres
                    </button>

                    <div className="my-1 border-t border-border" />

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