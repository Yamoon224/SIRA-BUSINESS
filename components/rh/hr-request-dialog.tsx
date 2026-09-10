"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HR_REQUEST_TYPE_META } from "@/lib/data/rh"
import { extractApiErrorMessage } from "@/lib/api-error"
import { employeeService, type HrRequestType, type IEmployee, type IHrRequest } from "@/lib/api/employee.service"

interface HrRequestDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    employee: IEmployee
    onCreated: (request: IHrRequest) => void
}

/** Enregistrement d'une demande RH (attestation, avance, formation…) pour un employé. */
export function HrRequestDialog({ open, onOpenChange, employee, onCreated }: HrRequestDialogProps) {
    const [type, setType] = useState<HrRequestType>("WORK_CERTIFICATE")
    const [subject, setSubject] = useState("")
    // Tant que l'objet n'a pas été retouché, il suit le type choisi.
    const [subjectTouched, setSubjectTouched] = useState(false)
    const [amount, setAmount] = useState("")
    const [description, setDescription] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open) {
            setType("WORK_CERTIFICATE")
            setSubject(HR_REQUEST_TYPE_META.WORK_CERTIFICATE.label)
            setSubjectTouched(false)
            setAmount("")
            setDescription("")
            setError(null)
        }
    }, [open])

    const needsAmount = HR_REQUEST_TYPE_META[type].needsAmount

    const submit = async () => {
        if (!subject.trim()) return setError("Donnez un objet à la demande.")
        if (needsAmount && (!amount || Number(amount) <= 0)) return setError("Indiquez le montant de l'avance demandée.")

        setSaving(true)
        setError(null)
        try {
            const request = await employeeService.createRequest(employee.id, {
                type,
                subject: subject.trim(),
                description: description.trim() || null,
                amount: needsAmount ? Number(amount) : null,
            })
            toast.success("Demande enregistrée.")
            onCreated(request)
            onOpenChange(false)
        } catch (err) {
            const message = extractApiErrorMessage(err, "L'enregistrement de la demande a échoué.")
            setError(message)
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Nouvelle demande RH</DialogTitle>
                    <DialogDescription>{employee.fullName}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <p className="mb-1.5 text-sm font-medium text-foreground">Type de demande</p>
                        <Select
                            value={type}
                            onValueChange={(v) => {
                                const next = v as HrRequestType
                                setType(next)
                                if (!subjectTouched) setSubject(HR_REQUEST_TYPE_META[next].label)
                                setError(null)
                            }}
                        >
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {(Object.keys(HR_REQUEST_TYPE_META) as HrRequestType[]).map((t) => (
                                    <SelectItem key={t} value={t}>{HR_REQUEST_TYPE_META[t].label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <p className="mb-1.5 text-sm font-medium text-foreground">
                            Objet<span className="ml-0.5 text-destructive">*</span>
                        </p>
                        <Input
                            value={subject}
                            onChange={(e) => {
                                setSubject(e.target.value)
                                setSubjectTouched(true)
                                setError(null)
                            }}
                            placeholder="ex : Attestation pour un dossier de prêt bancaire"
                        />
                    </div>

                    {needsAmount && (
                        <div>
                            <p className="mb-1.5 text-sm font-medium text-foreground">
                                Montant (FCFA)<span className="ml-0.5 text-destructive">*</span>
                            </p>
                            <Input type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => { setAmount(e.target.value); setError(null) }} placeholder="150000" />
                        </div>
                    )}

                    <div>
                        <p className="mb-1.5 text-sm font-medium text-foreground">Détails</p>
                        <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contexte, échéance souhaitée, destinataire du document…" />
                    </div>

                    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button disabled={saving} onClick={() => void submit()}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Enregistrer la demande
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
