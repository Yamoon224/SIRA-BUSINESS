"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Building2, Mail, MessageCircle } from "lucide-react"
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF, SUPPORT_PHONE, SUPPORT_WHATSAPP_HREF } from "@/lib/contact"
import { PlanFeatureList } from "@/components/pricing/plan-feature-list"

/**
 * Carte « Sur mesure » des pages tarification (page d'accueil, /tarification,
 * choix du forfait à l'inscription) : même disposition que les cartes de
 * forfait, mais pas un SubscriptionPlan - pas de prix fixe, pas de checkout.
 * Le CTA ouvre le choix du canal de contact (email ou téléphone/WhatsApp).
 */
export function CustomPlanCard() {
    const [contactOpen, setContactOpen] = useState(false)

    return (
        <>
            <div className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-md border border-black/[0.06] bg-white shadow-sm transition-transform duration-300 hover:-translate-y-1 sm:w-[calc(50%-0.75rem)] lg:w-[330px]">
                <div className="p-7">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[#2447FF]" />
                        <h3 className="text-xl font-semibold text-[#0B1220]">Sur mesure</h3>
                    </div>

                    <p className="mt-1 text-sm text-[#5B6472]">Grand compte ou besoins spécifiques</p>

                    <div className="mt-5 flex items-baseline gap-1.5">
                        <span className="text-4xl text-[#0B1220]">Sur devis</span>
                    </div>

                    <Button
                        variant="outline"
                        className="mt-6 w-full rounded-full border-black/10 transition-transform duration-200 hover:scale-[1.02]"
                        onClick={() => setContactOpen(true)}
                    >
                        Nous contacter
                    </Button>
                </div>

                <div className="flex-1 border-t border-black/[0.06] bg-[#F7F8FC] px-7 py-6">
                    <PlanFeatureList planName="Sur Mesure" className="space-y-3" />
                </div>
            </div>

            <Dialog open={contactOpen} onOpenChange={setContactOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Contactez-nous</DialogTitle>
                        <DialogDescription>
                            Décrivez vos besoins, notre équipe vous propose un forfait sur mesure.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">
                        <a
                            href={SUPPORT_EMAIL_HREF}
                            className="flex items-center gap-3 rounded-lg border border-black/[0.06] px-4 py-3 transition-colors hover:bg-[#F7F8FC]"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50">
                                <Mail className="h-4 w-4 text-blue-600" />
                            </span>
                            <span>
                                <span className="block text-sm font-medium text-[#0B1220]">Par email</span>
                                <span className="block text-xs text-[#5B6472]">{SUPPORT_EMAIL}</span>
                            </span>
                        </a>
                        <a
                            href={SUPPORT_WHATSAPP_HREF}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-lg border border-black/[0.06] px-4 py-3 transition-colors hover:bg-[#F7F8FC]"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50">
                                <MessageCircle className="h-4 w-4 text-green-600" />
                            </span>
                            <span>
                                <span className="block text-sm font-medium text-[#0B1220]">Par téléphone / WhatsApp</span>
                                <span className="block text-xs text-[#5B6472]">{SUPPORT_PHONE}</span>
                            </span>
                        </a>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
