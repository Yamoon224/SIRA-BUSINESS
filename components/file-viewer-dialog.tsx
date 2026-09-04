"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, ExternalLink, FileText } from "lucide-react"

export type ViewableFile = {
    name: string
    url: string
    mimeType?: string | null
}

type FileViewerDialogProps = {
    file: ViewableFile | null
    /** Sous-titre optionnel : à qui / à quoi le fichier se rattache. */
    subtitle?: string | null
    onClose: () => void
}

function isImage(mimeType?: string | null, url?: string): boolean {
    if (mimeType) return mimeType.startsWith("image/")
    return /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url ?? "")
}

function isPdf(mimeType?: string | null, url?: string): boolean {
    if (mimeType) return mimeType === "application/pdf"
    return /\.pdf(\?|$)/i.test(url ?? "")
}

/**
 * Lecteur de fichier en modale : on lit un CV ou une pièce jointe sans quitter
 * la page ni ouvrir un onglet.
 *
 * Le PDF et l'image se lisent sur place ; Word et consorts n'ont pas de visionneuse
 * navigateur, on propose alors le téléchargement plutôt qu'un cadre vide.
 */
export function FileViewerDialog({ file, subtitle, onClose }: FileViewerDialogProps) {
    const previewable = !!file && (isPdf(file.mimeType, file.url) || isImage(file.mimeType, file.url))

    return (
        <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="flex h-[88vh] max-w-4xl flex-col gap-3 overflow-hidden">
                <DialogHeader className="pr-8">
                    <DialogTitle className="truncate text-base">{file?.name ?? "Document"}</DialogTitle>
                    {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                </DialogHeader>

                {file && (
                    <>
                        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted/30">
                            {isPdf(file.mimeType, file.url) ? (
                                <object data={file.url} type="application/pdf" className="h-full w-full">
                                    {/* Repli quand le navigateur n'embarque pas de lecteur PDF
                                        (certains mobiles) : le lien reste utilisable. */}
                                    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                                        <FileText className="h-10 w-10 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">
                                            Votre navigateur n&apos;affiche pas les PDF ici.
                                        </p>
                                    </div>
                                </object>
                            ) : isImage(file.mimeType, file.url) ? (
                                <div className="flex h-full items-center justify-center p-4">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={file.url} alt={file.name} className="max-h-full max-w-full object-contain" />
                                </div>
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                                    <FileText className="h-10 w-10 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        Ce format ne se lit pas dans le navigateur. Téléchargez-le pour l&apos;ouvrir.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            {previewable && (
                                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4" />
                                        Ouvrir dans un onglet
                                    </a>
                                </Button>
                            )}
                            <Button size="sm" className="gap-1.5" asChild>
                                <a href={file.url} download={file.name}>
                                    <Download className="h-4 w-4" />
                                    Télécharger
                                </a>
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
