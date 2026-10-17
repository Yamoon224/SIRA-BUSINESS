"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarPlus, ChevronRight, Loader2, MapPin, Video } from "lucide-react"
import { recruitmentService, type IRecruitmentInterview } from "@/lib/api/recruitment.service"
import { todayIso } from "@/lib/data/rh"

/**
 * Prochains entretiens planifiés (GORIYA Meet ou présentiel) : même source que
 * le calendrier de Recrutements → Entretiens. Pas de création à la volée ici -
 * un entretien se planifie toujours depuis la fiche d'un candidat, pour rester
 * rattaché à sa candidature.
 */
function formatQuand(iso: string): string {
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

export function UpcomingInterviewsCard() {
    const [interviews, setInterviews] = useState<IRecruitmentInterview[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        recruitmentService.interviews({ from: todayIso() })
            .then((items) => setInterviews(items.filter((i) => i.status === "SCHEDULED")))
            .catch((err) => console.error("[dashboard] entretiens error:", err))
            .finally(() => setLoading(false))
    }, [])

    const prochains = [...interviews].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 3)

    return (
        <Card className="h-full">
            <CardContent className="flex h-full flex-col p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Prochains entretiens</p>
                    <Link href="/services-rh/recrutements" className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
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
                        prochains.map((interview) => {
                            const video = interview.type === "VIDEO"
                            const Icon = video ? Video : MapPin
                            return (
                                <Link
                                    key={interview.id}
                                    href={`/services-rh/recrutements/${interview.candidatureId}`}
                                    className="block rounded-md bg-muted p-3 transition-colors hover:bg-muted/70"
                                >
                                    <p className="mb-1.5 text-xs text-muted-foreground">{formatQuand(interview.scheduledAt)}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${video ? "bg-brand-gradient" : "bg-emerald-500"}`}>
                                            <Icon className="h-4 w-4 text-white" />
                                        </span>
                                        <p className="min-w-0 flex-1 truncate text-sm">{interview.candidate?.name ?? "Candidat"}</p>
                                        {video && interview.callSession?.status === "ACTIVE" && (
                                            <span className="shrink-0 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-medium text-white">
                                                En cours
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            )
                        })
                    )}
                </div>

                <Link
                    href="/services-rh/recrutements"
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-sm border bg-background px-3 py-1.5 text-xs shadow-xs transition-colors hover:bg-brand-gradient hover:text-primary-foreground"
                >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Planifier un entretien
                </Link>
            </CardContent>
        </Card>
    )
}
