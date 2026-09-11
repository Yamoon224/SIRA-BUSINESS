"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { FileText, FileUp, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DOCUMENT_CATEGORY_META, formatFileSize } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { hrDocumentService, type DocumentCategory, type IHrDocument } from "@/lib/api/hr-document.service"
import type { IEmployee } from "@/lib/api/employee.service"
import { cn } from "@/lib/utils"

const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx", "odt", "ods", "txt"]
const MAX_BYTES = 10 * 1024 * 1024
const COMPANY = "company"

interface DocumentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Document à modifier ; absent pour un dépôt. */
    document?: IHrDocument | null
    /** Choix du dossier (employé ou entreprise), sauf si `fixedEmployee` est donné. */
    employees?: Pick<IEmployee, "id" | "fullName" | "matricule">[]
    fixedEmployee?: { id: string; fullName: string } | null
    defaultCategory?: DocumentCategory
    onSaved: (document: IHrDocument) => void
}

/** Dépôt d'un document RH, ou modification de ses informations. */
export function DocumentDialog({ open, onOpenChange, document, employees = [], fixedEmployee, defaultCategory, onSaved }: DocumentDialogProps) {
    const editing = !!document
    const inputRef = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [dragOver, setDragOver] = useState(false)
    const [title, setTitle] = useState("")
    const [category, setCategory] = useState<DocumentCategory>("IDENTITY")
    const [owner, setOwner] = useState<string>(COMPANY)
    const [issuedAt, setIssuedAt] = useState("")
    const [expiresAt, setExpiresAt] = useState("")
    const [description, setDescription] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    const documentId = document?.id
    const fixedId = fixedEmployee?.id

    useEffect(() => {
        if (!open) return
        setFile(null)
        setDragOver(false)
        setTitle(document?.title ?? "")
        setCategory(document?.category ?? defaultCategory ?? (fixedId ? "IDENTITY" : "POLICY"))
        setOwner(document ? (document.employee?.id ?? COMPANY) : (fixedId ?? COMPANY))
        setIssuedAt(document?.issuedAt ?? "")
        setExpiresAt(document?.expiresAt ?? "")
        setDescription(document?.description ?? "")
        setError(null)
        // Les objets `document` et `fixedEmployee` changent d'identité à chaque rendu du parent.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, documentId, fixedId, defaultCategory])

    const pick = (picked?: File | null) => {
        if (!picked) return
        const extension = picked.name.split(".").pop()?.toLowerCase() ?? ""
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            setError("Formats acceptés : PDF, image (JPG, PNG, WebP), Word, Excel, OpenDocument ou texte.")
            return
        }
        if (picked.size > MAX_BYTES) {
            setError("Le fichier ne doit pas dépasser 10 Mo.")
            return
        }
        setFile(picked)
        setError(null)
        if (!title.trim()) setTitle(picked.name.replace(/\.[^.]+$/, ""))
    }

    const submit = async () => {
        if (!editing && !file) return setError("Choisissez le fichier à déposer.")
        if (editing && !title.trim()) return setError("Le document doit garder un titre.")
        if (issuedAt && expiresAt && expiresAt < issuedAt) return setError("La date d'expiration doit suivre la date de délivrance.")

        setSaving(true)
        setError(null)
        const metadata = {
            category,
            title: title.trim() || null,
            description: description.trim() || null,
            issuedAt: issuedAt || null,
            expiresAt: expiresAt || null,
            employeeId: owner === COMPANY ? null : owner,
        }
        try {
            const saved = editing ? await hrDocumentService.update(document.id, metadata) : await hrDocumentService.upload(file!, metadata)
            toast.success(editing ? "Document mis à jour." : "Document ajouté.")
            onSaved(saved)
            onOpenChange(false)
        } catch (err) {
            const message = extractApiErrorMessage(err, "L'enregistrement du document a échoué.")
            setError(message)
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    const generated = document?.source === "GENERATED"

    return (
        <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{editing ? "Modifier le document" : "Ajouter un document"}</DialogTitle>
                    <DialogDescription>
                        {fixedEmployee
                            ? `Dossier de ${fixedEmployee.fullName}.`
                            : "Rangez-le dans le dossier d'un employé, ou avec les documents communs de l'entreprise."}{" "}
                        Les fichiers restent privés à votre entreprise.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {!editing && (
                        <div
                            onDragOver={(e) => {
                                e.preventDefault()
                                setDragOver(true)
                            }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => {
                                e.preventDefault()
                                setDragOver(false)
                                pick(e.dataTransfer.files?.[0])
                            }}
                            className={cn("rounded-lg border-2 border-dashed p-4 transition-colors", dragOver ? "border-primary bg-secondary/60" : "border-border")}
                        >
                            {file ? (
                                <div className="flex items-center gap-3">
                                    <FileText className="h-8 w-8 shrink-0 text-primary" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                    </div>
                                    <Button size="icon-sm" variant="ghost" aria-label="Retirer le fichier" onClick={() => setFile(null)} className="hover:bg-muted">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="py-2 text-center">
                                    <FileUp className="mx-auto h-7 w-7 text-muted-foreground" />
                                    <p className="mt-2 text-sm text-foreground">
                                        Glissez le fichier ici ou{" "}
                                        <button type="button" onClick={() => inputRef.current?.click()} className="font-medium text-primary hover:underline">
                                            parcourez
                                        </button>
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">PDF, image, Word ou Excel — 10 Mo maximum.</p>
                                </div>
                            )}
                            <input
                                ref={inputRef}
                                type="file"
                                className="hidden"
                                accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
                                onChange={(e) => {
                                    pick(e.target.files?.[0])
                                    e.target.value = ""
                                }}
                            />
                        </div>
                    )}

                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-foreground">Titre</span>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Carte nationale d'identité, diplôme de master…" maxLength={150} />
                    </label>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <p className="mb-1.5 text-sm font-medium text-foreground">Catégorie</p>
                            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                                <SelectTrigger className="w-full" aria-label="Catégorie"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {(Object.keys(DOCUMENT_CATEGORY_META) as DocumentCategory[]).map((c) => (
                                        <SelectItem key={c} value={c}>{DOCUMENT_CATEGORY_META[c].label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="mt-1 text-[11px] text-muted-foreground">{DOCUMENT_CATEGORY_META[category].hint}</p>
                        </div>
                        {!fixedEmployee && (
                            <div>
                                <p className="mb-1.5 text-sm font-medium text-foreground">Dossier</p>
                                <Select value={owner} onValueChange={setOwner} disabled={generated}>
                                    <SelectTrigger className="w-full" aria-label="Dossier"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={COMPANY}>Document d&apos;entreprise</SelectItem>
                                        {employees.map((e) => (
                                            <SelectItem key={e.id} value={e.id}>{e.fullName} · {e.matricule}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {generated && <p className="mt-1 text-[11px] text-muted-foreground">Une attestation reste dans le dossier de son employé.</p>}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-foreground">Délivré le</span>
                            <Input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
                        </label>
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-foreground">Expire le</span>
                            <Input type="date" value={expiresAt} min={issuedAt || undefined} onChange={(e) => setExpiresAt(e.target.value)} />
                        </label>
                    </div>
                    <p className="-mt-2 text-[11px] text-muted-foreground">
                        Renseignez l&apos;expiration des pièces d&apos;identité et visites médicales : elles apparaîtront dans les échéances.
                    </p>

                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-foreground">Note</span>
                        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Facultatif" />
                    </label>

                    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button disabled={saving} onClick={() => void submit()}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {editing ? "Enregistrer" : "Ajouter"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
