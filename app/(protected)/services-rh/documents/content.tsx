"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { AlertTriangle, CalendarClock, CheckCircle2, Circle, ClipboardList, FilePlus2, FileSignature, FileWarning, FolderOpen, Search } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfirmDialog } from "@/components/rh/confirm-dialog"
import { DocumentDialog } from "@/components/rh/document-dialog"
import { DocumentGenerateDialog } from "@/components/rh/document-generate-dialog"
import { DocumentTable } from "@/components/rh/document-table"
import { EmployeeAvatar } from "@/components/rh/employee-avatar"
import { KpiCard } from "@/components/rh/kpi-card"
import {
    DOCUMENT_CATEGORY_META,
    EMPLOYEE_FILE_CHECKLIST,
    documentExpiry,
    employeeFileStatus,
    normaliseText,
    type FileChecklistStatus,
} from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { hrDocumentService, type DocumentCategory, type IHrDocument } from "@/lib/api/hr-document.service"
import { employeeService, type IEmployee } from "@/lib/api/employee.service"
import { cn } from "@/lib/utils"

const ALL = "all"
const COMPANY = "company"

const CHECK_ICON: Record<FileChecklistStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
    ok: { icon: CheckCircle2, className: "text-green-600", label: "Présent" },
    expired: { icon: AlertTriangle, className: "text-amber-600", label: "Expiré" },
    missing: { icon: Circle, className: "text-muted-foreground/40", label: "Manquant" },
}

/**
 * Page Documents RH : tous les documents de l'entreprise en un seul endroit —
 * dossiers des employés, documents communs, attestations, contrats signés et
 * bulletins — avec leurs échéances et la complétude des dossiers.
 */
export function DocumentsContent() {
    const [documents, setDocuments] = useState<IHrDocument[]>([])
    const [employees, setEmployees] = useState<IEmployee[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [tab, setTab] = useState("documents")
    const [query, setQuery] = useState("")
    const [category, setCategory] = useState<string>(ALL)
    const [owner, setOwner] = useState<string>(ALL)

    const [editor, setEditor] = useState<{ document: IHrDocument | null; employee?: IEmployee; category?: DocumentCategory } | null>(null)
    const [generateOpen, setGenerateOpen] = useState(false)
    const [toDelete, setToDelete] = useState<IHrDocument | null>(null)
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        try {
            const [documentList, employeeList] = await Promise.all([hrDocumentService.list(), employeeService.list()])
            setDocuments(documentList)
            setEmployees(employeeList)
            setLoadError(null)
        } catch (err) {
            setLoadError(extractApiErrorMessage(err, "Impossible de charger les documents RH."))
        }
    }, [])

    useEffect(() => {
        void load().finally(() => setLoading(false))
    }, [load])

    const present = useMemo(() => employees.filter((e) => e.status !== "TERMINATED"), [employees])

    const deadlines = useMemo(
        () =>
            documents
                .map((document) => ({ document, expiry: documentExpiry(document) }))
                .filter((row) => row.expiry && row.expiry.kind !== "VALID")
                .sort((a, b) => (a.document.expiresAt ?? "").localeCompare(b.document.expiresAt ?? ""))
                .map((row) => row.document),
        [documents],
    )

    const files = useMemo(
        () =>
            present.map((employee) => ({
                employee,
                items: employeeFileStatus(documents.filter((d) => d.employee?.id === employee.id)),
            })),
        [present, documents],
    )

    const kpis = useMemo(() => {
        const expiries = documents.map((d) => documentExpiry(d)?.kind)
        return {
            total: documents.length,
            company: documents.filter((d) => !d.employee).length,
            soon: expiries.filter((k) => k === "SOON").length,
            expired: expiries.filter((k) => k === "EXPIRED").length,
            incomplete: files.filter((f) => f.items.some((i) => i.status !== "ok")).length,
        }
    }, [documents, files])

    const filtered = useMemo(() => {
        const q = normaliseText(query.trim())
        return documents.filter((d) => {
            if (category !== ALL && d.category !== category) return false
            if (owner === COMPANY && d.employee) return false
            if (owner !== ALL && owner !== COMPANY && d.employee?.id !== owner) return false
            if (q && !normaliseText(`${d.title} ${d.fileName} ${d.employee?.fullName ?? ""} ${d.employee?.matricule ?? ""}`).includes(q)) return false
            return true
        })
    }, [documents, query, category, owner])

    const hasFilters = query.trim() !== "" || category !== ALL || owner !== ALL

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
        <div className="space-y-5 pb-8">
            <PageHeader
                title="Documents RH"
                description="Les documents de vos employés et de l'entreprise en un seul endroit : dossiers, attestations, contrats signés et bulletins."
                actions={
                    <>
                        <Button variant="outline" onClick={() => setGenerateOpen(true)} disabled={!loading && employees.length === 0} className="gap-1.5 rounded-full px-5 hover:bg-muted hover:text-foreground">
                            <FileSignature className="h-4 w-4" />
                            Rédiger une attestation
                        </Button>
                        <Button onClick={() => setEditor({ document: null })} className="gap-1.5 rounded-full px-5">
                            <FilePlus2 className="h-4 w-4" />
                            Ajouter un document
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard icon={FolderOpen} label="Documents" value={kpis.total} hint={`dont ${kpis.company} d'entreprise`} onClick={() => setTab("documents")} />
                <KpiCard icon={CalendarClock} label="Expirent sous 30 jours" value={kpis.soon} highlight={kpis.soon > 0} onClick={() => setTab("echeances")} />
                <KpiCard icon={FileWarning} label="Documents expirés" value={kpis.expired} highlight={kpis.expired > 0} onClick={() => setTab("echeances")} />
                <KpiCard
                    icon={ClipboardList}
                    label="Dossiers incomplets"
                    value={kpis.incomplete}
                    hint={present.length ? `sur ${present.length} employé${present.length > 1 ? "s" : ""} présent${present.length > 1 ? "s" : ""}` : undefined}
                    highlight={kpis.incomplete > 0}
                    onClick={() => setTab("dossiers")}
                />
            </div>

            {loading ? (
                <div className="space-y-2 rounded-xl border border-border bg-white p-3" aria-busy="true">
                    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}
                </div>
            ) : loadError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
                    <p>{loadError}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => { setLoading(true); void load().finally(() => setLoading(false)) }}>Réessayer</Button>
                </div>
            ) : (
                <Tabs value={tab} onValueChange={setTab}>
                    <div className="overflow-x-auto">
                        <TabsList>
                            <TabsTrigger value="documents">Tous les documents</TabsTrigger>
                            <TabsTrigger value="echeances">
                                Échéances
                                {deadlines.length > 0 && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">{deadlines.length}</span>}
                            </TabsTrigger>
                            <TabsTrigger value="dossiers">Dossiers du personnel</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="documents" className="mt-4 space-y-3">
                        <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3 lg:flex-row lg:items-center">
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un document, un employé, un matricule..." className="pl-9" aria-label="Rechercher" />
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="w-full lg:w-[190px]" aria-label="Filtrer par catégorie"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>Toutes les catégories</SelectItem>
                                        {(Object.keys(DOCUMENT_CATEGORY_META) as DocumentCategory[]).map((c) => (
                                            <SelectItem key={c} value={c}>{DOCUMENT_CATEGORY_META[c].label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={owner} onValueChange={setOwner}>
                                    <SelectTrigger className="w-full lg:w-[220px]" aria-label="Filtrer par dossier"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>Tous les dossiers</SelectItem>
                                        <SelectItem value={COMPANY}>Documents d&apos;entreprise</SelectItem>
                                        {employees.map((e) => (
                                            <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {hasFilters && (
                                <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setCategory(ALL); setOwner(ALL) }} className="hover:bg-muted hover:text-foreground">
                                    Réinitialiser
                                </Button>
                            )}
                        </div>

                        <DocumentTable
                            documents={filtered}
                            showEmployee
                            onEdit={(document) => setEditor({ document })}
                            onDelete={setToDelete}
                            emptyText={
                                documents.length === 0
                                    ? "Aucun document pour l'instant. Commencez par le règlement intérieur ou les pièces d'identité de vos employés."
                                    : "Aucun document ne correspond à ces critères."
                            }
                        />
                        <p className="text-xs text-muted-foreground">
                            Contrats signés et bulletins des douze derniers mois apparaissent ici en lecture seule : ils se gèrent depuis Contrats et Paie.
                        </p>
                    </TabsContent>

                    <TabsContent value="echeances" className="mt-4">
                        {deadlines.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center">
                                <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
                                <p className="mt-2 text-sm text-muted-foreground">Aucun document expiré ni sur le point de l&apos;être dans les 30 prochains jours.</p>
                            </div>
                        ) : (
                            <DocumentTable
                                documents={deadlines}
                                showEmployee
                                onEdit={(document) => setEditor({ document })}
                                onDelete={setToDelete}
                                emptyText=""
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="dossiers" className="mt-4">
                        {present.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">
                                Aucun employé présent.{" "}
                                <Link href="/services-rh/employes" className="font-medium text-primary hover:underline">Ajouter des employés</Link>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-xl border border-border bg-white">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                                            <TableHead>Employé</TableHead>
                                            {EMPLOYEE_FILE_CHECKLIST.map((item) => (
                                                <TableHead key={item.key} className="text-center">{item.label}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[...files]
                                            .sort((a, b) => b.items.filter((i) => i.status !== "ok").length - a.items.filter((i) => i.status !== "ok").length)
                                            .map(({ employee, items }) => (
                                                <TableRow key={employee.id}>
                                                    <TableCell>
                                                        <div className="flex min-w-0 items-center gap-2.5">
                                                            <EmployeeAvatar id={employee.id} firstName={employee.firstName} lastName={employee.lastName} size="sm" />
                                                            <div className="min-w-0">
                                                                <Link href={`/services-rh/employes/${employee.id}`} className="block truncate font-medium text-foreground hover:underline">
                                                                    {employee.fullName}
                                                                </Link>
                                                                <p className="truncate text-xs text-muted-foreground">{employee.jobTitle}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    {items.map((item) => {
                                                        const style = CHECK_ICON[item.status]
                                                        const Icon = style.icon
                                                        return (
                                                            <TableCell key={item.key} className="text-center">
                                                                {item.status === "ok" ? (
                                                                    <Icon className={cn("mx-auto h-5 w-5", style.className)} aria-label={`${item.label} : ${style.label}`} />
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setEditor({ document: null, employee, category: item.category })}
                                                                        title={`${style.label} — ajouter`}
                                                                        aria-label={`${item.label} de ${employee.fullName} : ${style.label}. Ajouter`}
                                                                        className="mx-auto flex items-center justify-center rounded-full p-1 transition-colors hover:bg-muted"
                                                                    >
                                                                        <Icon className={cn("h-5 w-5", style.className)} />
                                                                    </button>
                                                                )}
                                                            </TableCell>
                                                        )
                                                    })}
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            )}

            <DocumentDialog
                open={!!editor}
                onOpenChange={(open) => !open && setEditor(null)}
                document={editor?.document ?? null}
                employees={employees}
                fixedEmployee={editor?.employee ? { id: editor.employee.id, fullName: editor.employee.fullName } : null}
                defaultCategory={editor?.category}
                onSaved={() => void load()}
            />

            <DocumentGenerateDialog open={generateOpen} onOpenChange={setGenerateOpen} employees={employees} onGenerated={() => void load()} />

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
