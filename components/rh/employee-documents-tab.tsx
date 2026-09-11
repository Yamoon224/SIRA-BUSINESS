"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, Circle, FilePlus2, FileSignature, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/rh/confirm-dialog"
import { DocumentDialog } from "@/components/rh/document-dialog"
import { DocumentGenerateDialog } from "@/components/rh/document-generate-dialog"
import { DocumentTable } from "@/components/rh/document-table"
import { employeeFileStatus, type FileChecklistStatus } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { hrDocumentService, type DocumentCategory, type IHrDocument } from "@/lib/api/hr-document.service"
import type { IEmployee } from "@/lib/api/employee.service"
import { cn } from "@/lib/utils"

interface EmployeeDocumentsTabProps {
    employee: IEmployee
    /** Une attestation rédigée pour une demande change la demande : la fiche se recharge. */
    onChanged?: () => Promise<void> | void
}

const CHECK_STYLES: Record<FileChecklistStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
    ok: { icon: CheckCircle2, className: "text-green-600", label: "Présent" },
    expired: { icon: AlertTriangle, className: "text-amber-600", label: "Expiré" },
    missing: { icon: Circle, className: "text-muted-foreground/50", label: "Manquant" },
}

/** Onglet « Documents » de la fiche : pièces du dossier, attestations, contrats et bulletins. */
export function EmployeeDocumentsTab({ employee, onChanged }: EmployeeDocumentsTabProps) {
    const [documents, setDocuments] = useState<IHrDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [editor, setEditor] = useState<{ document: IHrDocument | null; category?: DocumentCategory } | null>(null)
    const [generateOpen, setGenerateOpen] = useState(false)
    const [toDelete, setToDelete] = useState<IHrDocument | null>(null)
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        try {
            setDocuments(await hrDocumentService.list({ employeeId: employee.id }))
            setLoadError(null)
        } catch (err) {
            setLoadError(extractApiErrorMessage(err, "Impossible de charger les documents de cet employé."))
        } finally {
            setLoading(false)
        }
    }, [employee.id])

    useEffect(() => {
        void load()
    }, [load])

    const checklist = useMemo(() => employeeFileStatus(documents), [documents])

    const remove = async () => {
        if (!toDelete) return
        setDeleting(true)
        try {
            await hrDocumentService.remove(toDelete.id)
            toast.success("Document supprimé.")
            setToDelete(null)
            await load()
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "La suppression du document a échoué."))
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">Dossier de {employee.firstName}</h2>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setGenerateOpen(true)} className="hover:bg-muted hover:text-foreground">
                        <FileSignature className="h-4 w-4" />
                        Rédiger une attestation
                    </Button>
                    <Button onClick={() => setEditor({ document: null })}>
                        <FilePlus2 className="h-4 w-4" />
                        Ajouter un document
                    </Button>
                </div>
            </div>

            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {checklist.map((item) => {
                    const style = CHECK_STYLES[item.status]
                    const Icon = style.icon
                    return (
                        <li key={item.key} className={cn("flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5", item.status === "ok" ? "border-border" : "border-dashed border-border")}>
                            <Icon className={cn("h-5 w-5 shrink-0", style.className)} aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                                <p className={cn("text-[11px]", item.status === "expired" ? "text-amber-700" : "text-muted-foreground")}>{style.label}</p>
                            </div>
                            {item.status !== "ok" && (
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label={`Ajouter : ${item.label}`}
                                    onClick={() => setEditor({ document: null, category: item.category })}
                                    className="hover:bg-muted hover:text-foreground"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            )}
                        </li>
                    )
                })}
            </ul>

            {loading ? (
                <div className="h-40 animate-pulse rounded-xl bg-muted" aria-busy="true" />
            ) : loadError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
                    <p>{loadError}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => { setLoading(true); void load() }}>Réessayer</Button>
                </div>
            ) : (
                <DocumentTable
                    documents={documents}
                    onEdit={(document) => setEditor({ document })}
                    onDelete={setToDelete}
                    emptyText={`Aucun document dans le dossier de ${employee.firstName}. Ajoutez sa pièce d'identité, son CV ou rédigez une attestation.`}
                />
            )}

            <DocumentDialog
                open={!!editor}
                onOpenChange={(open) => !open && setEditor(null)}
                document={editor?.document ?? null}
                fixedEmployee={editor?.document ? null : { id: employee.id, fullName: employee.fullName }}
                employees={[employee]}
                defaultCategory={editor?.category}
                onSaved={() => void load()}
            />

            <DocumentGenerateDialog
                open={generateOpen}
                onOpenChange={setGenerateOpen}
                employee={employee}
                onGenerated={() => {
                    void load()
                    void onChanged?.()
                }}
            />

            <ConfirmDialog
                open={!!toDelete}
                onOpenChange={(open) => !open && setToDelete(null)}
                title={`Supprimer « ${toDelete?.title ?? ""} » ?`}
                description="Le document et son fichier sont définitivement supprimés."
                confirmLabel="Supprimer"
                destructive
                loading={deleting}
                onConfirm={remove}
            />
        </div>
    )
}
