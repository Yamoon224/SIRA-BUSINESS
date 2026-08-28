"use client"

import { toast } from "sonner"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createCompany } from "@/actions/companies"
import { requestOtp, verifyOtp } from "@/actions/auth"
import { CompanyCreateDto } from "@/@types/interface"
import { Field, FieldLabel } from "@/components/ui/field"
import { SignupStepper } from "@/components/signup-stepper"
import { OTPVerificationModal } from "@/components/otp-verification-modal"
import { Upload, Plus, ArrowRight, ArrowLeft, EyeOff, Eye } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const steps = ["Entreprise", "Détails", "Contact"]

const sectors = [
    "Technologie",
    "Finance",
    "Santé",
    "Éducation",
    "Commerce",
    "Marketing",
    "Industrie",
    "Services",
]

const companySizes = [
    "1-10 employés",
    "11-50 employés",
    "51-200 employés",
    "201-500 employés",
    "500+ employés",
]

export default function Page() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [showPassword, setShowPassword] = useState(false);
    const [showOTPModal, setShowOTPModal] = useState(false)

    const [formData, setFormData] = useState<CompanyCreateDto>({
        logo: null,
        coverImage: null,
        companyName: "",
        about: "",
        sector: "",
        creationDate: "",
        companySize: "",
        website: "",
        socialLinks: [""],
        country: "",
        headquarters: "",
        location: "",
        phone: "",
        email: "",
        password: "",
    })

    const handlePrevious = async () => {
        if (currentStep >= 1) {
            setCurrentStep(currentStep - 1)
            return
        }
    }

    const handleNext = async () => {
        // Définir les champs obligatoires par étape
        const requiredFieldsByStep: Record<number, (keyof CompanyCreateDto)[]> = {
            0: ["logo", "coverImage", "companyName", "about", "sector"],
            1: ["creationDate", "companySize"],
            2: ["country", "headquarters", "location", "phone", "email", "password"],
        }
    
        const requiredFields = requiredFieldsByStep[currentStep] || []
        const missingFields = requiredFields.filter(field => {
            const value = formData[field]
            if (Array.isArray(value)) return value.filter(Boolean).length === 0
            return !value
        })
    
        if (missingFields.length > 0) {
            toast.error("Remplissez tous les champs obligatoires avant de continuer")
            return
        }
    
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1)
            return
        }
    
        // Si c'est la dernière étape, soumettre le formulaire
        setLoading(true)
        try {
            const body = new FormData()
            if (formData.logo) body.append("logo", formData.logo as File)
            if (formData.coverImage) body.append("coverImage", formData.coverImage as File)
            body.append("companyName", formData.companyName)
            body.append("about", formData.about)
            body.append("sector", formData.sector)
            body.append("creationDate", formData.creationDate)
            body.append("companySize", formData.companySize)
            body.append("website", formData.website)
            body.append("socialLinks", JSON.stringify(formData.socialLinks.filter(Boolean)))
            body.append("country", formData.country)
            body.append("headquarters", formData.headquarters)
            body.append("location", formData.location)
            body.append("phone", formData.phone)
            body.append("email", formData.email)
            body.append("password", formData.password)
            body.append("partnershipDate", new Date().toISOString().split("T")[0])
            body.append("status", "ACTIVE")
    
            const res = await createCompany(body)
            if (res.user?.id) {
                sessionStorage.setItem("entreprise_signup_userId", res.user.id)
            }

            toast.success("Vérifiez votre boîte mail pour le code de vérification")
            setShowOTPModal(true)
        } catch (error: any) {
            toast.error(error?.message || "Une erreur est survenue")
        } finally {
            setLoading(false)
        }
    }

    const handleOTPVerification = async (code: string) => {
        try {
            await verifyOtp(formData.email, code)

            // ✅ Établit la vraie session NextAuth (cookie httpOnly) au lieu de
            // dupliquer le token dans un cookie/localStorage non protégé.
            const signInResult = await signIn("credentials", {
                email: formData.email,
                password: formData.password,
                redirect: false,
            })

            if (signInResult?.error) throw new Error("Erreur lors de la connexion")

            setShowOTPModal(false)
            toast.success("Entreprise créée avec succès !")
            router.push("/auth/signup/plan")
        } catch (error: any) {
            toast.error(error?.message || "Code de vérification invalide. Réessayez.")
        }
    }

    const handleResendOTP = async () => {
        try {
            await requestOtp(formData.email)
            toast.success("Un nouveau code a été envoyé")
        } catch (error: any) {
            toast.error(error?.message || "Impossible d'envoyer le code pour le moment")
        }
    }

    const updateFormData = (field: keyof CompanyCreateDto, value: string | string[] | File | null) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const updateSocialLink = (index: number, value: string) => {
        const newLinks = [...formData.socialLinks]
        newLinks[index] = value
        updateFormData("socialLinks", newLinks)
    }

    const addSocialLink = () => {
        updateFormData("socialLinks", [...formData.socialLinks, ""])
    }

    return (
        <div>
            <div className="mb-8 text-center">
                <h1 className="text-3xl text-[#0B1220]">Créez votre espace entreprise</h1>
                <p className="mt-2 text-sm text-[#5B6472]">Quelques informations pour démarrer - deux minutes suffisent.</p>
            </div>

            <SignupStepper currentStep={currentStep} steps={steps} />

            {/* Step 1: Entreprise */}
            {currentStep === 0 && (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-medium text-foreground mb-4">Logo et bannières</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Logo Upload */}
                            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#2447FF]/25 bg-[#2447FF]/5 p-8 text-center cursor-pointer transition-colors hover:border-[#2447FF]/50 hover:bg-[#2447FF]/10">
                                {formData.logo ? (
                                    <img
                                        src={URL.createObjectURL(formData.logo as File)}
                                        alt="Logo"
                                        className="h-24 w-24 object-contain rounded-xl"
                                    />
                                ) : (
                                    <>
                                        <Upload className="h-8 w-8 text-[#2447FF]/60 mb-2" />
                                        <p className="text-sm font-medium text-[#0B1220]">Importer votre logo</p>
                                        <p className="text-xs text-[#5B6472] mt-1">PNG, JPEG, JPG, WEBP - max 2Mo</p>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept=".png,.jpeg,.jpg,.webp"
                                    className="hidden"
                                    onChange={(e) =>
                                        e.target.files && updateFormData("logo", e.target.files[0])
                                    }
                                />
                            </label>

                            {/* Cover Image Upload */}
                            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#FF6B4A]/30 bg-[#FF6B4A]/5 p-8 text-center cursor-pointer transition-colors hover:border-[#FF6B4A]/50 hover:bg-[#FF6B4A]/10">
                                {formData.coverImage ? (
                                    <img
                                        src={URL.createObjectURL(formData.coverImage as File)}
                                        alt="Cover Image"
                                        className="h-32 w-full object-cover rounded-xl"
                                    />
                                ) : (
                                    <>
                                        <Upload className="h-8 w-8 text-[#FF6B4A]/70 mb-2" />
                                        <p className="text-sm font-medium text-[#0B1220]">Importer votre image de couverture</p>
                                        <p className="text-xs text-[#5B6472] mt-1">PNG, JPEG, JPG, WEBP - max 2Mo</p>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept=".png,.jpeg,.jpg,.webp"
                                    className="hidden"
                                    onChange={(e) =>
                                        e.target.files && updateFormData("coverImage", e.target.files[0])
                                    }
                                />
                            </label>
                        </div>
                    </div>

                    {/* Nom + Secteur dans le même row */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 md:col-span-6">
                            <Field>
                                <FieldLabel>
                                    Nom de l'entreprise <span className="text-destructive">*</span>
                                </FieldLabel>
                                <Input
                                    value={formData.companyName}
                                    onChange={(e) => updateFormData("companyName", e.target.value)}
                                    placeholder="Entrez le nom"
                                />
                            </Field>
                        </div>

                        <div className="col-span-12 md:col-span-6">
                            <Field>
                                <FieldLabel>
                                    Secteur d'activité <span className="text-destructive">*</span>
                                </FieldLabel>
                                <Select value={formData.sector} onValueChange={(value) => updateFormData("sector", value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionnez un secteur" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sectors.map((sector) => (
                                            <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                    </div>

                    <Field>
                        <FieldLabel>
                            A propos <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Textarea
                            value={formData.about}
                            onChange={(e) => updateFormData("about", e.target.value)}
                            placeholder="Décrivez votre entreprise..."
                            rows={4}
                        />
                    </Field>
                </div>
            )}

            {/* Step 2: Détails */}
            {currentStep === 1 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 md:col-span-6">
                            <Field>
                                <FieldLabel>Date de création <span className="text-destructive">*</span></FieldLabel>
                                <Input type="date" value={formData.creationDate} onChange={(e) => updateFormData("creationDate", e.target.value)} />
                            </Field>
                        </div>

                        <div className="col-span-12 md:col-span-6">
                            <Field>
                                <FieldLabel>Taille de l'entreprise <span className="text-destructive">*</span></FieldLabel>
                                <Select value={formData.companySize} onValueChange={(value) => updateFormData("companySize", value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companySizes.map((size) => (
                                            <SelectItem key={size} value={size}>{size}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                    </div>

                    <Field>
                        <FieldLabel>Website</FieldLabel>
                        <Input type="url" value={formData.website} onChange={(e) => updateFormData("website", e.target.value)} placeholder="https://..." />
                    </Field>

                    {formData.socialLinks.map((link, index) => (
                        <Field key={index}>
                            <FieldLabel>Lien réseau social {index + 1}</FieldLabel>
                            <Input type="url" value={link} onChange={(e) => updateSocialLink(index, e.target.value)} placeholder="https://..." />
                        </Field>
                    ))}

                    <Button type="button" variant="outline" onClick={addSocialLink} className="w-full rounded-full border-dashed">
                        <Plus className="mr-2 h-4 w-4" /> Ajouter un autre lien
                    </Button>
                </div>
            )}

            {/* Step 3: Contact */}
            {currentStep === 2 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 md:col-span-6">
                            <Field>
                                <FieldLabel>Pays <span className="text-destructive">*</span></FieldLabel>
                                <Input value={formData.country} onChange={(e) => updateFormData("country", e.target.value)} placeholder="France" />
                            </Field>
                        </div>

                        <div className="col-span-12 md:col-span-6">
                            <Field>
                                <FieldLabel>Siège <span className="text-destructive">*</span></FieldLabel>
                                <Input value={formData.headquarters} onChange={(e) => updateFormData("headquarters", e.target.value)} placeholder="Paris" />
                            </Field>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 md:col-span-6">
                            <Field>
                                <FieldLabel>Localisation <span className="text-destructive">*</span></FieldLabel>
                                <Input value={formData.location} onChange={(e) => updateFormData("location", e.target.value)} placeholder="Ville, Pays" />
                            </Field>
                        </div>

                        <div className="col-span-12 md:col-span-6">
                            <Field>
                                <FieldLabel>Téléphone <span className="text-destructive">*</span></FieldLabel>
                                <Input type="tel" value={formData.phone} onChange={(e) => updateFormData("phone", e.target.value)} placeholder="+33 6 00 00 00 00" />
                            </Field>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 md:col-span-6">
                            <Field>
                                <FieldLabel>Email professionnel <span className="text-destructive">*</span></FieldLabel>
                                <Input type="email" value={formData.email} onChange={(e) => updateFormData("email", e.target.value)} placeholder="contact@entreprise.com" />
                            </Field>
                        </div>

                        <div className="col-span-12 md:col-span-6">
                            <Field>
                                <FieldLabel>Mot de passe <span className="text-destructive">*</span></FieldLabel>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => updateFormData("password", e.target.value)}
                                        placeholder="Votre mot de passe"
                                        required
                                        className="pr-10"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </Field>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Button */}
            <div className="mt-8 flex justify-center gap-2">
                {currentStep >= 1 ? (
                    <Button onClick={handlePrevious} variant="outline" className="w-30 rounded-full" size="lg"><ArrowLeft /></Button>
                ) : ''}
                <Button
                    onClick={handleNext}
                    className="w-30 rounded-full bg-[#0B1220] transition-transform duration-200 hover:scale-[1.02] hover:bg-[#0B1220]/90"
                    size="lg"
                >
                    {currentStep === steps.length - 1 ? "Terminer" : (<ArrowRight />)}
                </Button>
            </div>

            <OTPVerificationModal
                isOpen={showOTPModal}
                onClose={() => setShowOTPModal(false)}
                onVerify={handleOTPVerification}
                onResend={handleResendOTP}
            />
        </div>
    )
}
