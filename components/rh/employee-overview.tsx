import type { ReactNode } from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { contractTypeLabel, formatDate, formatFcfa, parseLocalDate } from "@/lib/data/rh"
import type { IEmployee } from "@/lib/api/employee.service"

function age(birthDate?: string | null): string | null {
    const birth = parseLocalDate(birthDate)
    if (!birth) return null
    const now = new Date()
    let years = now.getFullYear() - birth.getFullYear()
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) years -= 1
    return `${years} ans`
}

/** Onglet « Aperçu » de la fiche : toutes les informations, regroupées par thème. */
export function EmployeeOverview({ employee }: { employee: IEmployee }) {
    const genre = employee.gender === "F" ? "Femme" : employee.gender === "M" ? "Homme" : null
    const employeeAge = age(employee.birthDate)

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoCard title="Identité">
                <Info label="Matricule" value={employee.matricule} />
                <Info label="Prénom" value={employee.firstName} />
                <Info label="Nom" value={employee.lastName} />
                <Info label="Genre" value={genre} />
                <Info
                    label="Date de naissance"
                    value={employee.birthDate ? `${formatDate(employee.birthDate, { day: "numeric", month: "long", year: "numeric" })}${employeeAge ? ` (${employeeAge})` : ""}` : null}
                />
            </InfoCard>

            <InfoCard title="Coordonnées">
                <Info label="E-mail" value={employee.email ? <a href={`mailto:${employee.email}`} className="text-primary hover:underline">{employee.email}</a> : null} />
                <Info label="Téléphone" value={employee.phone ? <a href={`tel:${employee.phone.replace(/\s+/g, "")}`} className="text-primary hover:underline">{employee.phone}</a> : null} />
                <Info label="Adresse" value={employee.address} />
            </InfoCard>

            <InfoCard title="Poste">
                <Info label="Intitulé" value={employee.jobTitle} />
                <Info label="Département" value={employee.department} />
                <Info
                    label="Responsable"
                    value={
                        employee.manager ? (
                            <Link href={`/services-rh/employes/${employee.manager.id}`} className="text-primary hover:underline">
                                {employee.manager.fullName}
                                <span className="text-muted-foreground"> · {employee.manager.jobTitle}</span>
                            </Link>
                        ) : null
                    }
                />
            </InfoCard>

            <InfoCard title="Contrat et rémunération">
                <Info
                    label="Contrat en vigueur"
                    value={employee.activeContract ? `${employee.activeContract.reference} · ${employee.activeContract.signed ? "signé" : "non signé"}` : "Aucun"}
                />
                <Info label="Type de contrat" value={contractTypeLabel(employee.contractType)} />
                <Info label="Date d'embauche" value={formatDate(employee.hireDate, { day: "numeric", month: "long", year: "numeric" })} />
                <Info label="Fin de contrat" value={employee.contractEndDate ? formatDate(employee.contractEndDate, { day: "numeric", month: "long", year: "numeric" }) : null} />
                <Info label="Salaire brut mensuel" value={employee.salary !== null ? formatFcfa(employee.salary) : null} />
                <Info label="Congés annuels" value={`${employee.annualLeaveDays} jours ouvrés`} />
            </InfoCard>

            <InfoCard title="Contact d'urgence">
                <Info label="Nom" value={employee.emergencyContactName} />
                <Info label="Téléphone" value={employee.emergencyContactPhone ? <a href={`tel:${employee.emergencyContactPhone.replace(/\s+/g, "")}`} className="text-primary hover:underline">{employee.emergencyContactPhone}</a> : null} />
            </InfoCard>

            <InfoCard title="Origine de la fiche">
                {employee.source === "CANDIDATURE" ? (
                    <>
                        <Info
                            label="Recrutement"
                            value={
                                <span className="inline-flex items-center gap-1 font-medium text-primary">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Embauché via une candidature Goriya
                                </span>
                            }
                        />
                        <Info label="Offre" value={employee.hiredFrom?.jobOfferTitle ?? "Offre supprimée"} />
                        <Info label="Candidature reçue le" value={employee.hiredFrom?.appliedDate ? formatDate(employee.hiredFrom.appliedDate) : null} />
                    </>
                ) : (
                    <Info label="Recrutement" value="Saisie manuelle" />
                )}
                <Info label="Fiche créée le" value={formatDate(employee.createdAt)} />
            </InfoCard>

            {employee.notes && (
                <InfoCard title="Notes internes" className="lg:col-span-2">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{employee.notes}</p>
                </InfoCard>
            )}
        </div>
    )
}

function InfoCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
    return (
        <section className={`rounded-xl border border-border bg-white p-4 sm:p-5 ${className}`}>
            <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
            <dl className="divide-y divide-border">{children}</dl>
        </section>
    )
}

function Info({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5 py-2 text-sm first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-foreground sm:text-right">{value ?? <span className="text-muted-foreground">Non renseigné</span>}</dd>
        </div>
    )
}
