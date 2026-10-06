import { Method } from "axios";
import { Icon } from "next/dist/lib/metadata/types/metadata-types";

// PAGINATION
export interface IPaginationMeta {
    total: number
    page: number
    limit: number
    totalPages: number
}

// Interface générique pour pagination
export interface IPaginatedResponse<T> {
    data: T[]
    meta: IPaginationMeta
}

export interface RequestOptions {
    endpoint: string;
    method?: Method; // GET, POST, PUT, PATCH, DELETE
    data?: any;      // body data pour POST/PUT/PATCH
    token?: string;  // JWT si route protégée
    params?: any;    // query params pour GET
}

// PARAMETERS
export interface DashboardStatsParams {
    start?: string; // format ISO date
    end?: string;   // format ISO date
}

// RESPONSES TYPE
export interface StatCard {
    label: string
    value: string | number
    icon: Icon
    color: string
}

export interface ChartDataItem {
    name: string
    value: number
}

export interface TopOffer {
    id: string
    title: string
    company: { id: string; name: string } | null
}

export interface DashboardData {
    statsData: StatCard[]
    chartData: ChartDataItem[]
    lineChartData: ChartDataItem[]
    recentCandidates: ICandidate[]
    topOffers: TopOffer[]
    recentOffers: IOffer[]
}


export interface CompanyCreateDto {
    logo: File | null
    coverImage: File | null
    companyName: string
    about: string
    sector: string
    creationDate: string
    companySize: string
    website: string
    socialLinks: string[]
    country: string
    headquarters: string
    location: string
    phone: string
    email: string
    password: string
}


// INTERFACE ENTITE

export interface IUser {
    id: string
    name: string
    email: string
    role: string
    status: string
    avatar?: string | null
    registrationDate: string
    createdAt: string
    updatedAt: string
}

export interface ICompany {
    id: string
    name: string
    about: string
    sector: string
    companySize: string
    location: string
    website: string
    creationDate?: string
    partnershipDate?: string
    email: string
    phone: string
    logo?: string | null
    coverImage?: string | null
    gallery?: string[]
    socialLinks: string[]
    /** Mission et valeurs, choisies parmi COMPANY_VALUES (lib/data/entreprise.ts). */
    values?: string[]
    country: string
    headquarters: string
    status: string
    jobOffers: any[]       // Si tu veux, tu peux créer une interface IJobOffer
    users: IUser[]
    createdAt: string
    updatedAt: string
}

export interface ICandidate {
    id: string
    name: string           // candidateName
    email: string          // candidateEmail
    score: number
    status: "EN_ATTENTE" | "ACCEPTEE" | "REFUSEE"  // correspond à CandidatureStatus
    appliedDate: string    // ISO date string
    avatar?: string        // optionnel, pour l'affichage UI
    jobOfferId?: string    // ID du JobOffer lié
    jobOfferTitle?: string
    /** Coordonnées confirmées par le candidat à l'étape 1 du wizard. */
    phone?: string | null
    location?: string | null
    coverLetter?: string | null
    /** CV joint à cette candidature (null si le candidat n'en a pas choisi). */
    resume?: { id: string; name: string; url: string | null; mimeType?: string | null } | null
    /** Réponses aux questions de présélection de l'offre. */
    answers?: { id: string; question: string; type: string; value: string[] }[]
    /** Titre professionnel du candidat (User.title côté backend). */
    title?: string | null
    /** Compétences déclarées, agrégées du portfolio et du CV du candidat. */
    skills?: string[]
}

/**
 * Offre d'emploi. Tous les champs de détail sont nullables : une offre
 * enregistrée en brouillon (status "DRAFT") n'est complète qu'au moment d'être
 * publiée — le backend ne les exige qu'à ce moment-là.
 */
export interface IOffer {
    id: string
    title: string
    location: string | null
    type: "CDI" | "CDD" | "STAGE" | "ALTERNANCE" | "FREELANCE" | "TEMPS_PARTIEL" | null // map à JobType
    experience: "JUNIOR" | "INTERMEDIAIRE" | "SENIOR" | "EXPERT" | null // map à JobExperienceType
    salary: string | null
    description: string | null
    benefits: string | null
    requirements: string[] | null
    status: "ACTIVE" | "CLOSED" | "DRAFT"  // JobStatus
    publishDate: string | null
    endDate: string | null
    applicants: number
    candidatures: any[]
    company?: ICompany
    /** Questions de présélection posées au candidat (cf. lib/data/questions). */
    questions?: {
        id: string
        label: string
        type: string
        options: string[] | null
        required: boolean
        position: number
    }[]
    createdAt: string
    updatedAt: string
}