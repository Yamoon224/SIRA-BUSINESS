"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Download, Eye, FileImage, FileSpreadsheet, FileText, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileViewerDialog, type ViewableFile } from "@/components/file-viewer-dialog"
import { StatusPill } from "@/components/rh/status-pill"
import { DOCUMENT_CATEGORY_META, DOCUMENT_SOURCE_LABEL, documentExpiry, formatDate, formatFileSize } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { hrDocumentService, type IHrDocument } from "@/lib/api/hr-document.service"
import { cn } from "@/lib/utils"

interface DocumentTableProps {
    documents: IHrDocument[]
    /** Liste de l'entreprise : colonne « Dossier ». */
    showEmployee?: boolean
    onEdit?: (document: IHrDocument) => void
    onDelete?: (document: IHrDocument) => void
    emptyText: string
}

export const documentKey = (document: IHrDocument) => `${document.source}-${document.id}`

const previewable = (document: IHrDocument) => document.mimeType === "application/pdf" || !!document.mimeType?.startsWith("image/")

function DocumentIcon({ mimeType }: { mimeType: string | null }) {
    const Icon = mimeType?.startsWith("image/") ? FileImage : /sheet|excel|spreadsheet/.test(mimeType ?? "") ? FileSpreadsheet : FileText
    return <Icon className="h-5 w-5 shrink-0 text-primary" />
}

/** Échéance d'un document : expiré, bientôt expiré, ou valide jusqu'à une date. */
export function ExpiryBadge({ document }: { document: Pick<IHrDocument, "expiresAt"> }) {
    const expiry = documentExpiry(document)
    if (!expiry) return <span className="text-muted-foreground">-</span>
    if (expiry.kind === "EXPIRED") {
        return <StatusPill meta={{ label: `Expiré depuis ${expiry.days} j`, className: "bg-red-100 text-red-700" }} />
    }
    if (expiry.kind === "SOON") {
        return <StatusPill meta={{ label: expiry.days === 0 ? "Expire aujourd'hui" : `Expire dans ${expiry.days} j`, className: "bg-amber-100 text-amber-800" }} />
    }
    return <span className="whitespace-nowrap text-xs text-muted-foreground">Jusqu&apos;au {formatDate(document.expiresAt)}</span>
}

/**
 * Tableau de documents : aperçu des PDF et images, téléchargement, et pour les
 * documents du module, modification et suppression. Contrats signés et
 * bulletins restent en lecture seule.
 */
export function DocumentTable({ documents, showEmployee = false, onEdit, onDelete, emptyText }: DocumentTableProps) {
    const [busyKey, setBusyKey] = useState<string | null>(null)
    const [preview, setPreview] = useState<{ file: ViewableFile; subtitle: string } | null>(null)

    const run = async (document: IHrDocument, action: () => Promise<void>, failure: string) => {
        setBusyKey(documentKey(document))
        try {
            await action()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, failure))
        } finally {
            setBusyKey(null)
        }
    }

    const openPreview = (document: IHrDocument) =>
        run(
            document,
            async () => {
                const url = await hrDocumentService.previewUrl(document)
                setPreview({
                    file: { name: document.fileName, url, mimeType: document.mimeType },
                    subtitle: [document.title, document.employee?.fullName].filter(Boolean).join(" · "),
                })
            },
            "L'aperçu du document a échoué.",
        )

    const closePreview = () => {
        if (preview) URL.revokeObjectURL(preview.file.url)
        setPreview(null)
    }

    if (documents.length === 0) {
        return <p className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">{emptyText}</p>
    }

    return (
        <>
            <div className="overflow-hidden rounded-xl border border-border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead>Document</TableHead>
                            <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                            {showEmployee && <TableHead className="hidden lg:table-cell">Dossier</TableHead>}
                            <TableHead className="hidden sm:table-cell">Date</TableHead>
                            <TableHead>Échéance</TableHead>
                            <TableHead className="w-24 text-right"><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.map((document) => {
                            const busy = busyKey === documentKey(document)
                            return (
                                <TableRow key={documentKey(document)}>
                                    <TableCell>
                                        <div className="flex min-w-0 items-start gap-2.5">
                                            <DocumentIcon mimeType={document.mimeType} />
                                            <div className="min-w-0">
                                                <p className="max-w-[18rem] truncate font-medium text-foreground" title={document.title}>{document.title}</p>
                                                <p className="max-w-[18rem] truncate text-xs text-muted-foreground">
                                                    {[document.fileName, formatFileSize(document.size), document.source !== "UPLOAD" ? DOCUMENT_SOURCE_LABEL[document.source] : null]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </p>
                                                <StatusPill meta={DOCUMENT_CATEGORY_META[document.category]} className="mt-1 md:hidden" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <StatusPill meta={DOCUMENT_CATEGORY_META[document.category]} />
                                    </TableCell>
                                    {showEmployee && (
                                        <TableCell className="hidden lg:table-cell">
                                            {document.employee ? (
                                                <Link href={`/services-rh/employes/${document.employee.id}`} className="block max-w-[12rem] truncate text-foreground hover:underline">
                                                    {document.employee.fullName}
                                                </Link>
                                            ) : (
                                                <span className="text-muted-foreground">Entreprise</span>
                                            )}
                                        </TableCell>
                                    )}
                                    <TableCell className="hidden whitespace-nowrap sm:table-cell">{formatDate(document.issuedAt ?? document.createdAt)}</TableCell>
                                    <TableCell>
                                        <ExpiryBadge document={document} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-0.5">
                                            {busy ? (
                                                <Loader2 className="m-2 h-4 w-4 animate-spin text-primary" aria-label="Chargement" />
                                            ) : previewable(document) ? (
                                                <Button size="icon-sm" variant="ghost" aria-label={`Aperçu de ${document.title}`} title="Aperçu" onClick={() => void openPreview(document)} className="hover:bg-muted hover:text-foreground">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            ) : null}
                                            <Button
                                                size="icon-sm"
                                                variant="ghost"
                                                disabled={busy}
                                                aria-label={`Télécharger ${document.title}`}
                                                title="Télécharger"
                                                onClick={() => void run(document, () => hrDocumentService.download(document), "Le téléchargement a échoué.")}
                                                className="hover:bg-muted hover:text-foreground"
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            {document.editable && (onEdit || onDelete) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="icon-sm" variant="ghost" aria-label={`Actions sur ${document.title}`} className="hover:bg-muted hover:text-foreground">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        {onEdit && (
                                                            <DropdownMenuItem onSelect={() => onEdit(document)}>
                                                                <Pencil className="h-4 w-4" />
                                                                Modifier
                                                            </DropdownMenuItem>
                                                        )}
                                                        {onEdit && onDelete && <DropdownMenuSeparator />}
                                                        {onDelete && (
                                                            <DropdownMenuItem onSelect={() => onDelete(document)} className="text-red-600 focus:text-red-600">
                                                                <Trash2 className="h-4 w-4" />
                                                                Supprimer
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                            {!document.editable && <span className={cn("inline-block w-8")} aria-hidden="true" />}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            <FileViewerDialog file={preview?.file ?? null} subtitle={preview?.subtitle} onClose={closePreview} />
        </>
    )
}
