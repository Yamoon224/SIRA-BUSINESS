"use client"

import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import {
    INDICATIF_PAR_DEFAUT,
    PAYS_INDICATIFS,
    PAYS_PAR_DEFAUT,
    drapeau,
    separerIndicatif,
} from "@/lib/data/afrique"
import { cn } from "@/lib/utils"

interface PhoneInputProps {
    /** Numéro complet, indicatif inclus (« +225 07 39 47 82 »). */
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    id?: string
    name?: string
    disabled?: boolean
    "aria-invalid"?: boolean
}

/**
 * Champ téléphone unique de l'espace entreprise : sélecteur d'indicatif
 * international + numéro local, sur une seule valeur texte.
 *
 * Format de stockage : « <indicatif> <numéro local> » (ex. « +225 07 39 47 82 »).
 * Un seul espace, entre l'indicatif et le reste — assez normalisé pour être
 * comparé, assez lisible pour être réaffiché tel quel. Les numéros déjà en base
 * sont relus par `separerIndicatif`, y compris collés (« +2250739… ») ou avec un
 * indicatif hors Afrique (+33…) ; ceux dont l'indicatif est inconnu restent
 * affichés intégralement dans le champ numéro plutôt que d'être tronqués.
 */
export function PhoneInput({
    value,
    onChange,
    placeholder = "07 39 47 82",
    className,
    id,
    name,
    disabled,
    ...aria
}: PhoneInputProps) {
    const { indicatif, numero } = useMemo(() => {
        const brut = (value ?? "").trim()
        const separe = separerIndicatif(brut)
        if (!separe.indicatif) return { indicatif: INDICATIF_PAR_DEFAUT, numero: brut }
        // `separerIndicatif` compacte le numéro ; on lui préfère la fin de la
        // saisie d'origine, qui garde les espaces que l'utilisateur a tapés.
        const reste = brut.startsWith(separe.indicatif) ? brut.slice(separe.indicatif.length) : separe.numero
        return { indicatif: separe.indicatif, numero: reste.trimStart() }
    }, [value])

    const pays = PAYS_INDICATIFS.find((p) => p.indicatif === indicatif) ?? PAYS_PAR_DEFAUT

    /** Un numéro vide ne doit pas laisser un indicatif orphelin en base. */
    const recomposer = (ind: string, num: string) => (num.trim() ? `${ind} ${num.trim()}` : "")

    return (
        <div className={cn("flex gap-2", className)}>
            <Select value={indicatif} onValueChange={(v) => onChange(recomposer(v, numero))} disabled={disabled}>
                {/* Contenu du déclencheur écrit à la main : SelectValue reprendrait
                    le libellé complet de l'item (drapeau + indicatif + pays). */}
                <SelectTrigger className="h-9 w-[108px] shrink-0 px-2" aria-label="Indicatif pays">
                    <span className="flex items-center gap-1.5">
                        <span>{drapeau(pays.iso)}</span>
                        <span>{pays.indicatif}</span>
                    </span>
                </SelectTrigger>
                <SelectContent className="max-h-64">
                    {PAYS_INDICATIFS.map((p) => (
                        <SelectItem key={p.iso} value={p.indicatif} className="text-sm">
                            <span className="mr-1.5">{drapeau(p.iso)}</span>
                            {p.indicatif}
                            <span className="ml-1.5 text-muted-foreground">{p.nom}</span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Input
                id={id}
                name={name}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                disabled={disabled}
                aria-invalid={aria["aria-invalid"]}
                value={numero}
                placeholder={placeholder}
                // Ne laisse passer que ce qui compose un numéro : chiffres,
                // espaces et séparateurs usuels. Le « + » est réservé au
                // sélecteur d'indicatif.
                onChange={(e) => onChange(recomposer(indicatif, e.target.value.replace(/[^\d\s.\-()]/g, "")))}
                className="flex-1"
            />
        </div>
    )
}

/**
 * Validation partagée : au moins 6 chiffres après l'indicatif. Volontairement
 * permissive, les plans de numérotation variant d'un pays à l'autre — il s'agit
 * d'attraper la saisie manifestement incomplète, pas de certifier le numéro.
 */
export function telephoneValide(value: string): boolean {
    const { numero } = separerIndicatif(value ?? "")
    return numero.replace(/\D/g, "").length >= 6
}
