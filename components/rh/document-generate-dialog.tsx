"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HR_TEMPLATE_META, formatDate, todayIso } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { hrDocumentService, type HrDocumentTemplate, type IHrDocument } from "@/lib/api/hr-document.service"
import { employeeService, type IEmployee, type IHrRequest } from "@/lib/api/employee.service"
import { cn } from "@/lib/utils"

const NONE = "none"
const DEFAULT_SIGNATORY_TITLE = "Responsable des ressources humaines"

interface DocumentGenerateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Employé imposé (fiche, demande) ; sinon choisi dans `employees`. */
    employee?: IEmployee | null
    employees?: IEmployee[]
    preset?: { template?: HrDocumentTemplate; hrRequestId?: string | null }
    onGenerated: (document: IHrDocument) => void
}

/**
 * Rédaction d'une attestation depuis la fiche employé. Rattachée à une demande
 * RH ouverte, elle approuve cette demande. Le .docx sort prêt à signer.
 */
export function DocumentGenerateDialog({ open, onOpenChange, employee, employees = [], preset, onGenerated }: DocumentGenerateDialogProps) {
    const [employeeId, setEmployeeId] = useState("")
    const [template, setTemplate] = useState<HrDocumentTemplate>("WORK_CERTIFICATE")
    const [requests, setRequests] = useState<IHrRequest[]>([])
    const [hrRequestId, setHrRequestId] = useState(NONE)
    const [signatoryName, setSignatoryName] = useState("")
    const [signatoryTitle, setSignatoryTitle] = useState(DEFAULT_SIGNATORY_TITLE)
    const [city, setCity] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [result, setResult] = useState<IHrDocument | null>(null)
    const [downloading, setDownloading] = useState(false)

    const presetTemplate = preset?.template
    const presetRequest = preset?.hrRequestId

    useEffect(() => {
        if (!open) return
        setEmployeeId(employee?.id ?? "")
        setTemplate(presetTemplate ?? "WORK_CERTIFICATE")
        setHrRequestId(presetRequest ?? NONE)
        setError(null)
        setResult(null)
    }, [open, employee?.id, presetTemplate, presetRequest])

    useEffect(() => {
        if (!open || !employeeId) {
            setRequests([])
            return
        }
        let cancelled = false
        employeeService
            .requests(employeeId)
            .then((list) => !cancelled && setRequests(list))
            .catch(() => !cancelled && setRequests([]))
        return () => {
            cancelled = true
        }
    }, [open, employeeId])

    const selected = employee ?? employees.find((e) => e.id === employeeId) ?? null
    const today = todayIso()

    const availability = useMemo(() => {
        const left = !!selected && (selected.status === "TERMINATED" || (!!selected.contractEndDate && selected.contractEndDate < today))
        return {
            WORK_CERTIFICATE: null,
            SALARY_CERTIFICATE: selected && selected.salary === null ? "Salaire non renseigné sur la fiche" : null,
            EMPLOYMENT_CERTIFICATE: selected && !left ? "Réservé aux employés partis ou en fin de contrat" : null,
        } as Record<HrDocumentTemplate, string | null>
    }, [selected, today])

    const eligibleRequests = requests.filter(
        (r) => (r.status === "PENDING" || r.status === "IN_PROGRESS") && r.type === HR_TEMPLATE_META[template].requestType,
    )
    const linkedRequest = eligibleRequests.find((r) => r.id === hrRequestId) ?? null

    const submit = async () => {
        if (!selected) return setError("Choisissez l'employé concerné.")
        if (availability[template]) return setError(availability[template])
        setSaving(true)
        setError(null)
        try {
            const document = await hrDocumentService.generate(selected.id, {
                template,
                hrRequestId: linkedRequest?.id ?? null,
                signatoryName: signatoryName.trim() || null,
                signatoryTitle: signatoryTitle.trim() || null,
                city: city.trim() || null,
            })
            setResult(document)
            toast.success(linkedRequest ? "Attestation rédigée : la demande est approuvée." : "Attestation rédigée et rangée dans le dossier.")
            onGenerated(document)
        } catch (err) {
            const message = extractApiErrorMessage(err, "La rédaction de l'attestation a échoué.")
            setError(message)
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    const download = async () => {
        if (!result) return
        setDownloading(true)
        try {
            await hrDocumentService.download(result)
        } catch (err) {
            toast.error(extractApiErrorMessage(err, "Le téléchargement a échoué."))
        } finally {
            setDownloading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Rédiger une attestation</DialogTitle>
                    <DialogDescription>
                        {selected ? `${selected.fullName} · ${selected.jobTitle}` : "Le document reprend les informations de la fiche employé."}
                    </DialogDescription>
                </DialogHeader>

                {result ? (
                    <div className="space-y-4 py-2 text-center">
                        <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
                        <div>
                            <p className="font-semibold text-foreground">{result.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Rangée dans le dossier de {result.employee?.fullName ?? "l'employé"}. À signer et à revêtir du cachet avant de la remettre.
                            </p>
                        </div>
                        <div className="flex flex-col justify-center gap-2 sm:flex-row">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
                            <Button onClick={() => void download()} disabled={downloading}>
                                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                Télécharger (.docx)
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            {!employee && (
                                <div>
                                    <p className="mb-1.5 text-sm font-medium text-foreground">Employé</p>
                                    <Select value={employeeId || undefined} onValueChange={(v) => { setEmployeeId(v); setHrRequestId(NONE); setError(null) }}>
                                        <SelectTrigger className="w-full" aria-label="Employé"><SelectValue placeholder="Choisir un employé" /></SelectTrigger>
                                        <SelectContent>
                                            {employees.map((e) => (
                                                <SelectItem key={e.id} value={e.id}>
                                                    {e.fullName} · {e.matricule}
                                                    {e.status === "TERMINATED" ? " (parti)" : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2" role="radiogroup" aria-label="Document à rédiger">
                                {(Object.keys(HR_TEMPLATE_META) as HrDocumentTemplate[]).map((value) => {
                                    const unavailable = availability[value]
                                    const checked = template === value
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            role="radio"
                                            aria-checked={checked}
                                            disabled={!!unavailable}
                                            onClick={() => { setTemplate(value); setHrRequestId(presetRequest ?? NONE); setError(null) }}
                                            className={cn(
                                                "w-full rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                                                checked ? "border-primary bg-secondary/70" : "border-border hover:bg-muted",
                                            )}
                                        >
                                            <p className={cn("text-sm font-semibold", checked ? "text-primary" : "text-foreground")}>{HR_TEMPLATE_META[value].label}</p>
                                            <p className="text-xs text-muted-foreground">{unavailable ?? HR_TEMPLATE_META[value].description}</p>
                                        </button>
                                    )
                                })}
                            </div>

                            {eligibleRequests.length > 0 && (
                                <div>
                                    <p className="mb-1.5 text-sm font-medium text-foreground">En réponse à une demande</p>
                                    <Select value={linkedRequest ? linkedRequest.id : NONE} onValueChange={setHrRequestId}>
                                        <SelectTrigger className="w-full" aria-label="Demande RH"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={NONE}>Aucune demande</SelectItem>
                                            {eligibleRequests.map((r) => (
                                                <SelectItem key={r.id} value={r.id}>{r.subject} · {formatDate(r.createdAt)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {linkedRequest && <p className="mt-1 text-[11px] text-muted-foreground">La demande sera approuvée, avec le document joint.</p>}
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1.5 block text-sm font-medium text-foreground">Signataire</span>
                                    <Input value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} placeholder="Par défaut : le nom du compte" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-sm font-medium text-foreground">Fonction</span>
                                    <Input value={signatoryTitle} onChange={(e) => setSignatoryTitle(e.target.value)} />
                                </label>
                            </div>
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-foreground">Fait à</span>
                                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Par défaut : le siège de l'entreprise" />
                            </label>

                            {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Annuler</Button>
                            <Button disabled={saving || !selected} onClick={() => void submit()}>
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                Rédiger
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
