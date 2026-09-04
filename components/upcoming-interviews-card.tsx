"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CalendarPlus, ChevronRight, Loader2, Video } from "lucide-react"
import { callSessionService, type ICallSession } from "@/lib/api/call-session.service"
import { extractApiErrorMessage } from "@/lib/api-error"

/**
 * Un entretien est un appel vidéo GORIYA Call planifié : la carte lit et écrit
 * les mêmes sessions que la page /appels, elle n'a pas de stockage à part.
 */
function formatQuand(iso: string | null): string {
    if (!iso) return "Sans date"
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return "Sans date"

    const aujourdhui = new Date()
    const demain = new Date(aujourdhui)
    demain.setDate(demain.getDate() + 1)

    const heure = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    const memeJour = (a: Date, b: Date) => a.toDateString() === b.toDateString()

    if (memeJour(date, aujourdhui)) return `Aujourd'hui, ${heure}`
    if (memeJour(date, demain)) return `Demain, ${heure}`

    return `${date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}, ${heure}`
}

/** Valeur par défaut du champ datetime-local : demain à 9h30, arrondi utile. */
function defautPlanification(): string {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(9, 30, 0, 0)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function UpcomingInterviewsCard() {
    const [sessions, setSessions] = useState<ICallSession[]>([])
    const [loading, setLoading] = useState(true)

    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState("")
    const [scheduledAt, setScheduledAt] = useState(defautPlanification())
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        callSessionService.list()
            .then((res) => {
                const items = ((res as any)?.data ?? res ?? []) as ICallSession[]
                setSessions(Array.isArray(items) ? items : [])
            })
            .catch((err) => console.error("[dashboard] entretiens error:", err))
            .finally(() => setLoading(false))
    }, [])

    // Un entretien terminé n'a plus rien à faire dans « prochains entretiens ».
    const prochains = sessions
        .filter((s) => s.status !== "ENDED")
        .sort((a, b) => {
            // Les sessions sans date passent après celles qui en ont une.
            if (!a.scheduledAt) return 1
            if (!b.scheduledAt) return -1
            return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        })
        .slice(0, 3)

    const handleCreate = async () => {
        const intitule = title.trim()
        if (!intitule) {
            toast.error("Donnez un intitulé à l'entretien.")
            return
        }

        setCreating(true)
        try {
            const res = await callSessionService.schedule(
                intitule,
                scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
            )
            const creee = ((res as any)?.data ?? res) as ICallSession
            setSessions((prev) => [creee, ...prev])
            setOpen(false)
            setTitle("")
            setScheduledAt(defautPlanification())
            toast.success("Entretien programmé. Retrouvez le lien dans « Appels vidéo ».")
        } catch (err) {
            console.error("[dashboard] planification entretien error:", err)
            toast.error(extractApiErrorMessage(err, "La programmation de l'entretien a échoué."))
        } finally {
            setCreating(false)
        }
    }

    return (
        <>
            <Card className="h-full">
                <CardContent className="flex h-full flex-col p-5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">Prochains entretiens</p>
                        <Link href="/appels" className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                            Tout voir
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="flex-1 space-y-2">
                        {loading ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                            </div>
                        ) : prochains.length === 0 ? (
                            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                                Aucun entretien programmé pour le moment.
                            </p>
                        ) : (
                            prochains.map((s) => (
                                <Link
                                    key={s.id}
                                    href="/appels"
                                    className="block rounded-md bg-muted p-3 transition-colors hover:bg-muted/70"
                                >
                                    <p className="mb-1.5 text-xs text-muted-foreground">{formatQuand(s.scheduledAt)}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
                                            <Video className="h-4 w-4 text-white" />
                                        </span>
                                        <p className="min-w-0 flex-1 truncate text-sm">{s.title}</p>
                                        {s.status === "ACTIVE" && (
                                            <span className="shrink-0 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-medium text-white">
                                                En cours
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full gap-1.5 text-xs"
                        onClick={() => setOpen(true)}
                    >
                        <CalendarPlus className="h-3.5 w-3.5" />
                        Programmer un nouvel interview
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={(o) => !creating && setOpen(o)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Programmer un entretien</DialogTitle>
                        <DialogDescription>
                            Une salle GORIYA Call est créée à l&apos;enregistrement. Vous retrouverez le lien
                            à partager dans « Appels vidéo ».
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="interview-title">Intitulé</Label>
                            <Input
                                id="interview-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Entretien — Développeur Front-end"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="interview-date">Date et heure</Label>
                            <Input
                                id="interview-date"
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Laissez vide pour créer une salle utilisable immédiatement.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>
                            Annuler
                        </Button>
                        <Button onClick={handleCreate} disabled={creating} className="gap-1.5">
                            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                            {creating ? "Création…" : "Programmer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
