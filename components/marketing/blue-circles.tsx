/**
 * Motif de cercles décoratif posé sur les surfaces bleues.
 *
 * Reprend le vocabulaire du Hero de l'app standard : anneaux épais et pastille
 * pleine en #7ab2ff, un bleu plus clair que le fond #1e7df2 — assez lisible
 * pour se voir, assez proche pour rester un fond et ne pas concurrencer le
 * texte posé dessus.
 *
 * Purement ornemental : `aria-hidden` et `pointer-events-none`, jamais dans
 * l'ordre de tabulation ni sous le curseur. Le contenu des sections reste en
 * `relative z-10` au-dessus.
 */

type Variant = "panel" | "hero"

interface BlueCirclesProps {
    /**
     * "panel" : colonne verticale étroite (panneau de marque de l'inscription).
     * "hero"  : bandeau large, motif regroupé à droite pour laisser le texte
     *           centré respirer.
     */
    variant?: Variant
    className?: string
}

export function BlueCircles({ variant = "hero", className = "" }: BlueCirclesProps) {
    if (variant === "panel") {
        return (
            <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
            >
                {/* Anneaux concentriques */}
                <div className="absolute left-10 top-16 h-40 w-40 rounded-full border-[18px] border-[#7ab2ff] opacity-60" />
                <div className="absolute left-[4.75rem] top-[5.75rem] h-[4.5rem] w-[4.5rem] rounded-full border-[12px] border-[#7ab2ff] opacity-50" />
                {/* Pastille pleine */}
                <div className="absolute left-6 top-[13.5rem] h-14 w-14 rounded-full bg-[#7ab2ff] opacity-70" />
                {/* Anneau bas, volontairement rogné par le bord droit */}
                <div className="absolute -right-10 top-[19rem] h-32 w-32 rounded-full border-[14px] border-[#7ab2ff] opacity-55" />
            </div>
        )
    }

    return (
        <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 right-0 hidden w-[380px] overflow-hidden md:block ${className}`}
        >
            <div className="absolute right-16 top-8 h-36 w-36 rounded-full border-[18px] border-[#7ab2ff] opacity-60" />
            <div className="absolute right-28 top-20 h-14 w-14 rounded-full border-[10px] border-[#7ab2ff] opacity-40" />
            <div className="absolute right-40 top-40 h-12 w-12 rounded-full bg-[#7ab2ff] opacity-70" />
            <div className="absolute right-4 top-52 h-24 w-24 rounded-full border-[14px] border-[#7ab2ff] opacity-60" />
        </div>
    )
}
