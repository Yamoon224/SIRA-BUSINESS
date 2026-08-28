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
import { Camera, MapPin, Globe, Users, Calendar, Save, Plus, X } from "lucide-react"

export default function Content({ company }: ProfilContentProps) {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)
    const [logo, setLogo] = useState<File | null>(null)
    const [companyData, setCompanyData] = useState<ICompany>(company)
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
            const formData = new FormData()
            formData.append("companyName", companyData.name)
            formData.append("about", companyData.about)
            formData.append("sector", companyData.sector)
            formData.append("companySize", companyData.companySize)
            formData.append("location", companyData.location)
            formData.append("website", companyData.website)
            formData.append("email", companyData.email)
            formData.append("phone", companyData.phone)
            if (companyData.creationDate) {
                formData.append("creationDate", new Date(companyData.creationDate).toISOString())
            }
            if (logo) formData.append("logo", logo)
            // ✅ Appel relayé via /api/proxy : le Bearer token est attaché côté serveur
            // à partir de la session NextAuth, sans jamais transiter par le client.
            await updateCompany(companyId, formData)
            toast.success("Profil Entreprise mis à jour")
        } catch (error: any) {
            toast.error(error.message)
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
            <div className="rounded-xl border border-border bg-white p-6">
                <div className="flex flex-col items-start gap-5 md:flex-row">
                    {/* Avatar + camera */}
                    <div className="relative shrink-0">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-blue-500">
                            {companyData.logo ? (
                                <img
                                    src={"https://goriya-backend-production.up.railway.app/" + companyData.logo}
                                    alt="logo"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <span className="text-2xl font-bold text-white">
                                    {companyData.name?.[0]?.toUpperCase() ?? "C"}
                                </span>
                            )}
                        </div>
                        <label className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-blue-500 shadow">
                            <Camera className="h-3 w-3 text-white" />
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => setLogo(e.target.files?.[0] || null)}
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
