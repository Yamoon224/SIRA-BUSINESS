import { JWT } from "next-auth/jwt"
import { apiRequest } from "./api-client-http";
import CredentialsProvider from "next-auth/providers/credentials";
import { DefaultUser, DefaultSession, User, Session } from "next-auth";

// NEXTAUTH_SECRET est le nom conventionnel lu implicitement par NextAuth ;
// NEXT_AUTH_SECRET (sans le premier underscore) est celui historiquement
// utilisé dans ce repo. Sans ce fallback, un déploiement qui ne configure
// que NEXTAUTH_SECRET (cas standard) fait tourner ce provider avec un
// secret vide en production : le JWT de session ne peut plus être signé de
// façon fiable, ce qui casse silencieusement la redirection post-login
// (voir standard/lib/auth.ts, qui a déjà ce même fallback).
const authSecret = process.env.NEXTAUTH_SECRET ?? process.env.NEXT_AUTH_SECRET;

// 🔹 Étendre les types NextAuth
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
            companyId: string;
            access_token: string;
        } & DefaultSession["user"];
        error?: "RefreshAccessTokenError";
    }

    interface User extends DefaultUser {
        id: string
        name: string
        email: string
        role: string
        companyId: string
        access_token: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string
        role?: string
        companyId?: string
        access_token?: string
        accessTokenExpires?: number
        error?: "RefreshAccessTokenError"
    }
}

// Le token backend (tymon/jwt-auth) expire au bout de JWT_TTL (60 min par
// défaut), alors que la session NextAuth vit 30 jours : sans rotation, toute
// requête authentifiée renvoyait "Unauthorized" une heure après la connexion.
// On lit l'échéance directement dans le JWT et on le rafraîchit un peu avant.
const REFRESH_MARGIN_MS = 5 * 60 * 1000

function jwtExpiresAtMs(jwt?: string): number {
    if (!jwt) return 0
    try {
        const payload = jwt.split(".")[1]
        const json = JSON.parse(
            Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
        )
        return typeof json.exp === "number" ? json.exp * 1000 : 0
    } catch {
        return 0
    }
}

async function refreshBackendToken(currentToken: string): Promise<string> {
    const res = await apiRequest<{ token: string }>({
        endpoint: "/auth/refresh",
        method: "POST",
        token: currentToken,
    })
    if (!res?.token) throw new Error("no token in refresh response")
    return res.token
}

// 🔹 NextAuth options (tu peux aussi les mettre dans un fichier séparé `auth.ts`)
export const authOptions = {
    providers: [
        CredentialsProvider({
            id: "credentials",
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const data = await apiRequest<{ access_token: string; user: any }>({
                    endpoint: "/auth/login",
                    method: "POST",
                    data: {
                        email: credentials.email,
                        password: credentials.password,
                    },
                });

                if (!data?.access_token || !data?.user) return null;

                return {
                    id: data.user.id,
                    name: data.user.name,
                    email: data.user.email,
                    role: data.user.role,
                    companyId: data.user.company.id,
                    access_token: data.access_token,
                };
            },
        }),

        // Connexion via Google. Le `credential` (ID token) est revérifié côté
        // serveur par POST /auth/google — on ne fait jamais confiance à des
        // données d'identité envoyées par le client. `allowSignup: false` :
        // l'espace entreprise n'ouvre une session que pour un compte ENTREPRISE
        // déjà existant (la création d'un compte passe par /auth/signup).
        CredentialsProvider({
            id: "google",
            name: "Google",
            credentials: {
                credential: { label: "Google credential", type: "text" },
            },
            async authorize(credentials) {
                const credential = credentials?.credential as string | undefined;
                if (!credential) return null;

                try {
                    const res = await apiRequest<{ access_token: string; user: any }>({
                        endpoint: "/auth/google",
                        method: "POST",
                        data: { credential, allowSignup: false },
                    });

                    const payload = (res as any)?.data ?? res;
                    if (!payload?.access_token || !payload?.user) return null;
                    if (payload.user.role !== "ENTREPRISE" || !payload.user.company?.id) return null;

                    return {
                        id: payload.user.id,
                        name: payload.user.name,
                        email: payload.user.email,
                        role: payload.user.role,
                        companyId: payload.user.company.id,
                        access_token: payload.access_token,
                    };
                } catch (error: any) {
                    console.error("[authorize:google] échec:", error?.message ?? error);
                    return null;
                }
            },
        }),
    ],
    session: { strategy: "jwt" as const },
    secret: authSecret,
    // ✅ ICI tu ajoutes les callbacks
    callbacks: {
        async jwt({
            token,
            user,
        }: {
            token: JWT
            user?: User & { access_token?: string; role?: string }
        }) {
            // 1. Connexion initiale : on hydrate le token de session.
            if (user) {
                token.access_token = user.access_token
                token.role = user.role
                token.id = user.id
                token.companyId = user.companyId
                token.accessTokenExpires = jwtExpiresAtMs(user.access_token)
                delete token.error
                return token
            }

            // 2. Token backend encore valide (marge de sécurité) : rien à faire.
            const expiresAt = (token.accessTokenExpires as number) || jwtExpiresAtMs(token.access_token as string)
            if (expiresAt && Date.now() < expiresAt - REFRESH_MARGIN_MS) {
                return token
            }

            // 3. Rotation avant expiration (ou juste après, dans la fenêtre refresh_ttl).
            try {
                const fresh = await refreshBackendToken(token.access_token as string)
                token.access_token = fresh
                token.accessTokenExpires = jwtExpiresAtMs(fresh)
                delete token.error
            } catch (err) {
                console.error("[auth] échec du rafraîchissement du token backend:", err)
                token.error = "RefreshAccessTokenError"
            }
            return token
        },

        async session({
            session,
            token,
        }: {
            session: Session
            token: JWT
        }) {
            if (session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as string
                session.user.access_token = token.access_token as string
                session.user.companyId = token.companyId as string // 🔹 Ajouté
            }
            if (token.error === "RefreshAccessTokenError") {
                session.error = "RefreshAccessTokenError"
            }
            return session
        },
    }
};