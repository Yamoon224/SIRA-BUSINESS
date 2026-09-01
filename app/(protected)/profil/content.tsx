"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { updateCompany } from "@/actions/companies"
import { ProfilContentProps } from "@/@types/props"
import { ICompany } from "@/@types/interface"
import { toast } from "sonner"
import { Camera, MapPin, Globe, Users, Calendar, Save, Plus, X, ImagePlus } from "lucide-react"

/** Extrait un message lisible quelle que soit la forme de l'erreur (Error, body JSON Laravel, string, Blob, ArrayBuffer…). */
async function errorMessage(error: unknown): Promise<string> {
    const fallback = "Une erreur est survenue lors de l'enregistrement."
    if (!error) return fallback
    if (typeof error === "string") return error.trim().slice(0, 300) || fallback
    if (error instanceof Error) return error.message || fallback

    // Réponses binaires renvoyées par le proxy (413 nginx, page d'erreur HTML…)
    let raw = error
    if (typeof Blob !== "undefined" && raw instanceof Blob) {
        try { raw = JSON.parse(await raw.text()) } catch { try { raw = (await (error as Blob).text()) } catch { /* noop */ } }
    } else if (raw instanceof ArrayBuffer) {
        try { raw = JSON.parse(new TextDecoder().decode(raw)) } catch { raw = new TextDecoder().decode(error as ArrayBuffer) }
    }
    if (typeof raw === "string") return raw.trim().slice(0, 300) || fallback

    if (raw && typeof raw === "object") {
        const e = raw as Record<string, any>
        if (typeof e.message === "string" && e.message) return e.message
        if (e.errors && typeof e.errors === "object") {
            const first = Object.values(e.errors)[0]
            if (Array.isArray(first) && typeof first[0] === "string") return first[0]
        }
    }
    return fallback
}

/**
 * Redimensionne/compresse une image côté navigateur avant upload.
 * Évite les 413 (le proxy Next / la plateforme plafonnent le corps de requête)
 * et accélère l'envoi. Retourne le fichier d'origine si la compression échoue.
 */
async function compressImage(file: File, maxSize = 1600, quality = 0.82): Promise<File> {
    if (!file.type.startsWith("image/") || file.type === "image/gif") return file
    try {
        const bitmap = await createImageBitmap(file)
        const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
        const w = Math.round(bitmap.width * scale)
        const h = Math.round(bitmap.height * scale)
        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")
        if (!ctx) return file
        ctx.drawImage(bitmap, 0, 0, w, h)
        const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality))
        if (!blob || blob.size >= file.size) return file
        return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" })
    } catch {
        return file
    }
}

export default function Content({ company }: ProfilContentProps) {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)
    const [logo, setLogo] = useState<File | null>(null)
    const [cover, setCover] = useState<File | null>(null)
    const [galleryNew, setGalleryNew] = useState<File[]>([])
    const [removedGallery, setRemovedGallery] = useState<string[]>([])
    const [companyData, setCompanyData] = useState<ICompany>(company)

    const existingGallery = (companyData.gallery ?? []).filter((url) => !removedGallery.includes(url))
    const [benefits, setBenefits] = useState<string[]>([])
    const [newBenefit, setNewBenefit] = useState("")
    const [mission, setMission] = useState(company.about ?? "")

    const activeOffers = (company.jobOffers as any[])?.filter((j: any) => j.status === "ACTIVE").length ?? null
    const totalApplicants = (company.jobOffers as any[])?.reduce((sum: number, j: any) => sum + (j.applicants ?? 0), 0) ?? null

    const stats = [
        { value: company.companySize ?? "-", label: "Employés",       color: "text-blue-500" },
        { value: activeOffers != null ? String(activeOffers) : "-",  label: "Offres actives",  color: "text-orange-400" },
        { value: "-", label: "Note moyenne",    color: "text-yellow-400" },
        { value: totalApplicants != null ? String(totalApplicants) : "-", label: "Candidatures",    color: "text-green-500" },
    ]

    const addBenefit = () => {
        if (newBenefit.trim() && !benefits.includes(newBenefit.trim())) {
            setBenefits([...benefits, newBenefit.trim()])
            setNewBenefit("")
        }
    }

    const removeBenefit = (b: string) => setBenefits(benefits.filter((x) => x !== b))

    const handleSubmit = async () => {
        try {
            setLoading(true)
            const companyId = session?.user?.companyId
            if (!companyId) throw new Error("Non authentifié")

            // Garde-fou taille : évite un 413 opaque côté serveur.
            const MAX_BYTES = 8 * 1024 * 1024
            const oversized = [logo, cover, ...galleryNew].find((f) => f && f.size > MAX_BYTES)
            if (oversized) {
                throw new Error(`« ${oversized.name} » dépasse 8 Mo. Choisis une image plus légère.`)
            }

            const formData = new FormData()
            formData.append("companyName", companyData.name ?? "")
            formData.append("about", companyData.about ?? "")
            formData.append("sector", companyData.sector ?? "")
            formData.append("companySize", companyData.companySize ?? "")
            formData.append("location", companyData.location ?? "")
            formData.append("website", companyData.website ?? "")
            formData.append("email", companyData.email ?? "")
            formData.append("phone", companyData.phone ?? "")
            if (companyData.creationDate) {
                const d = new Date(companyData.creationDate)
                if (!isNaN(d.getTime())) formData.append("creationDate", d.toISOString())
            }
            if (logo) formData.append("logo", logo)
            if (cover) formData.append("coverImage", cover)
            galleryNew.forEach((file) => formData.append("gallery[]", file))
            removedGallery.forEach((url) => formData.append("removedGallery[]", url))
            // ✅ Appel relayé via /api/proxy : le Bearer token est attaché côté serveur
            // à partir de la session NextAuth, sans jamais transiter par le client.
            const updated = await updateCompany(companyId, formData) as any
            const fresh = (updated?.data ?? updated) as ICompany
            if (fresh?.id) {
                setCompanyData(fresh)
                setGalleryNew([])
                setRemovedGallery([])
                setLogo(null)
                setCover(null)
            }
            toast.success("Profil Entreprise mis à jour")
        } catch (error: any) {
            console.error("[profil] erreur enregistrement (brut) :", error)
            toast.error(await errorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-xl font-semibold text-foreground">Profil Entreprise</h1>
                <p className="text-sm text-muted-foreground">Gère les informations publiques de votre entreprise</p>
            </div>

            {/* ── Section identité ── */}
            <div className="overflow-hidden rounded-xl border border-border bg-white">
                {/* Bandeau de couverture éditable */}
                <div className="relative h-40 w-full bg-gradient-to-r from-blue-600 to-blue-400">
                    {(cover || companyData.coverImage) && (
                        <img
                            src={cover ? URL.createObjectURL(cover) : (companyData.coverImage as string)}
                            alt="couverture"
                            className="h-full w-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none" }}
                        />
                    )}
                    <label className="absolute bottom-3 right-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/60">
                        <Camera className="h-3.5 w-3.5" />
                        Modifier la couverture
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                                const f = e.target.files?.[0]
                                setCover(f ? await compressImage(f, 2000) : null)
                            }}
                        />
                    </label>
                </div>

                <div className="flex flex-col items-start gap-5 p-6 md:flex-row">
                    {/* Avatar + camera */}
                    <div className="relative -mt-14 shrink-0">
                        <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-blue-500">
                            <span className="text-2xl font-bold text-white">
                                {companyData.name?.[0]?.toUpperCase() ?? "C"}
                            </span>
                            {(logo || companyData.logo) && (
                                <img
                                    src={logo ? URL.createObjectURL(logo) : (companyData.logo as string)}
                                    alt="logo"
                                    className="absolute inset-0 h-full w-full object-cover"
                                    onError={(e) => { e.currentTarget.style.display = "none" }}
                                />
                            )}
                        </div>
                        <label className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-blue-500 shadow">
                            <Camera className="h-3 w-3 text-white" />
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                    const f = e.target.files?.[0]
                                    setLogo(f ? await compressImage(f, 512) : null)
                                }}
                            />
                        </label>
                    </div>

                    {/* Fields grid */}
                    <div className="grid flex-1 grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                        <div>
                            <p className="mb-1 text-xs text-muted-foreground">Nom de l&apos;entreprise *</p>
                            <Input
                                value={companyData.name}
                                onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                                placeholder="Nom de l'entreprise"
                                className="h-8 border-0 border-b border-border rounded-none px-0 text-sm shadow-none focus-visible:ring-0"
                            />
                        </div>
                        <div>
                            <p className="mb-1 text-xs text-muted-foreground">Secteur d&apos;activité *</p>
                            <Input
                                value={companyData.sector}
                                onChange={(e) => setCompanyData({ ...companyData, sector: e.target.value })}
                                placeholder="Secteur d'activité"
                                className="h-8 border-0 border-b border-border rounded-none px-0 text-sm shadow-none focus-visible:ring-0"
                            />
                        </div>
                        <div>
                            <p className="mb-1 text-xs text-muted-foreground">Adresse du siège</p>
                            <div className="flex items-center gap-1.5 border-b border-border pb-1">
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <Input
                                    value={companyData.location}
                                    onChange={(e) => setCompanyData({ ...companyData, location: e.target.value })}
                                    placeholder="Ville, Pays"
                                    className="h-7 border-0 px-0 text-sm shadow-none focus-visible:ring-0"
                                />
                            </div>
                        </div>
                        <div>
                            <p className="mb-1 text-xs text-muted-foreground">Site web</p>
                            <div className="flex items-center gap-1.5 border-b border-border pb-1">
                                <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <Input
                                    value={companyData.website}
                                    onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                                    placeholder="https://exemple.com"
                                    className="h-7 border-0 px-0 text-sm shadow-none focus-visible:ring-0"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Informations générales ── */}
            <div className="rounded-xl border border-border bg-white p-6 space-y-5">
                <h2 className="text-base font-semibold text-foreground">Informations générales</h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                        <p className="mb-1 text-xs text-muted-foreground">Taille de l&apos;entreprise</p>
                        <div className="flex items-center gap-2 text-sm text-foreground">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <Input
                                value={companyData.companySize}
                                onChange={(e) => setCompanyData({ ...companyData, companySize: e.target.value })}
                                placeholder="ex: 50-200 employés"
                                className="h-8 border-0 border-b border-border rounded-none px-0 text-sm shadow-none focus-visible:ring-0"
                            />
                        </div>
                    </div>
                    <div>
                        <p className="mb-1 text-xs text-muted-foreground">Année de création</p>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Input
                                value={companyData.creationDate ?? ""}
                                onChange={(e) => setCompanyData({ ...companyData, creationDate: e.target.value })}
                                placeholder="2010"
                                className="h-8 border-0 border-b border-border rounded-none px-0 text-sm shadow-none focus-visible:ring-0"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <p className="mb-1.5 text-xs text-muted-foreground">Description de l&apos;entreprise</p>
                    <Textarea
                        value={companyData.about}
                        onChange={(e) => setCompanyData({ ...companyData, about: e.target.value })}
                        placeholder="Décrivez votre entreprise..."
                        rows={3}
                        className="text-sm resize-none"
                    />
                </div>

                <div>
                    <p className="mb-1.5 text-xs text-muted-foreground">Mission et valeurs</p>
                    <Textarea
                        value={mission}
                        onChange={(e) => setMission(e.target.value)}
                        placeholder="Décrivez votre mission et vos valeurs..."
                        rows={3}
                        className="text-sm resize-none"
                    />
                </div>
            </div>

            {/* ── Galerie photos ── */}
            <div className="rounded-xl border border-border bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground">Galerie photos</h2>
                    <span className="text-xs text-muted-foreground">{existingGallery.length + galleryNew.length}/12</span>
                </div>
                <p className="text-xs text-muted-foreground">
                    Ces photos illustrent votre entreprise sur votre fiche publique (locaux, équipe, événements…).
                </p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {existingGallery.map((url) => (
                        <div key={url} className="group relative aspect-video overflow-hidden rounded-lg border border-border">
                            <img src={url} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />
                            <button
                                type="button"
                                onClick={() => setRemovedGallery((prev) => [...prev, url])}
                                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                    {galleryNew.map((file, i) => (
                        <div key={i} className="group relative aspect-video overflow-hidden rounded-lg border border-dashed border-blue-400">
                            <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                            <button
                                type="button"
                                onClick={() => setGalleryNew((prev) => prev.filter((_, idx) => idx !== i))}
                                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                    {existingGallery.length + galleryNew.length < 12 && (
                        <label className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-blue-400 hover:text-blue-500">
                            <ImagePlus className="h-5 w-5" />
                            <span className="text-[11px]">Ajouter</span>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                multiple
                                className="hidden"
                                onChange={async (e) => {
                                    const files = Array.from(e.target.files ?? [])
                                    e.target.value = ""
                                    const compressed = await Promise.all(files.map((f) => compressImage(f)))
                                    setGalleryNew((prev) => [...prev, ...compressed].slice(0, 12))
                                }}
                            />
                        </label>
                    )}
                </div>
            </div>

            {/* ── Avantages et bénéfices ── */}
            <div className="rounded-xl border border-border bg-white p-6 space-y-4">
                <h2 className="text-base font-semibold text-foreground">Avantages et bénéfices</h2>

                <div className="flex items-center gap-2">
                    <Input
                        value={newBenefit}
                        onChange={(e) => setNewBenefit(e.target.value)}
                        placeholder="Ajouter un avantage"
                        className="flex-1 text-sm"
                        onKeyDown={(e) => { if (e.key === "Enter") addBenefit() }}
                    />
                    <button
                        onClick={addBenefit}
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-gray-50 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {benefits.map((b) => (
                        <span
                            key={b}
                            className="flex items-center gap-1.5 rounded-full border border-border bg-gray-50 px-3 py-1 text-xs text-foreground"
                        >
                            {b}
                            <button onClick={() => removeBenefit(b)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>

                <p className="text-xs text-muted-foreground">
                    Ces avantages seront affichés sur vos offres d&apos;emploi pour attirer les meilleurs candidats.
                </p>
            </div>

            {/* ── Informations de contact ── */}
            <div className="rounded-xl border border-border bg-white p-6 space-y-5">
                <h2 className="text-base font-semibold text-foreground">Informations de contact</h2>

                <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                    <div>
                        <p className="mb-1 text-xs text-muted-foreground">Responsable RH</p>
                        <Input
                            defaultValue={(company.users as any[])?.[0]?.name ?? ""}
                            placeholder="Nom du responsable RH"
                            className="h-8 border-0 border-b border-border rounded-none px-0 text-sm shadow-none focus-visible:ring-0"
                        />
                    </div>
                    <div>
                        <p className="mb-1 text-xs text-muted-foreground">Email de contact</p>
                        <Input
                            value={companyData.email}
                            onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                            placeholder="contact@entreprise.com"
                            className="h-8 border-0 border-b border-border rounded-none px-0 text-sm shadow-none focus-visible:ring-0"
                        />
                    </div>
                    <div>
                        <p className="mb-1 text-xs text-muted-foreground">Téléphone</p>
                        <Input
                            value={companyData.phone}
                            onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                            placeholder="+33 6 00 00 00 00"
                            className="h-8 border-0 border-b border-border rounded-none px-0 text-sm shadow-none focus-visible:ring-0"
                        />
                    </div>
                    <div>
                        <p className="mb-1 text-xs text-muted-foreground">Linkedin entreprise</p>
                        <Input
                            defaultValue={(company.socialLinks as string[])?.[0] ?? ""}
                            placeholder="https://linkedin.com/company/..."
                            className="h-8 border-0 border-b border-border rounded-none px-0 text-sm shadow-none focus-visible:ring-0"
                        />
                    </div>
                </div>
            </div>

            {/* ── Statistiques ── */}
            <div className="rounded-xl border border-border bg-white p-6 space-y-4">
                <h2 className="text-base font-semibold text-foreground">Statistiques de l&apos;entreprise</h2>
                <div className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0">
                    {stats.map((s) => (
                        <div key={s.label} className="flex flex-col items-center py-3">
                            <span className={`text-3xl font-bold ${s.color}`}>{s.value}</span>
                            <span className="mt-1 text-xs text-muted-foreground">{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Save button ── */}
            <div className="flex justify-center pt-2">
                <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-white hover:bg-primary/90"
                >
                    <Save className="h-4 w-4" />
                    Enregistrer les modifications
                </Button>
            </div>
        </div>
    )
}
