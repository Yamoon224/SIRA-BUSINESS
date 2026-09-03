import { getToken } from 'next-auth/jwt';
import { NextResponse, NextRequest } from 'next/server';
import { isPublicRoute } from '@/lib/utils';

// Note : depuis Next.js 16, la convention "middleware.ts" est dépréciée au profit de
// "proxy.ts" (même mécanisme, nouveau nom) — ce fichier est donc bien exécuté par Next.js.
export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ✅ routes publiques
    if (isPublicRoute(pathname)) {
        return NextResponse.next();
    }

    // ✅ récupérer le token JWT côté proxy (lit le cookie de session NextAuth httpOnly)
    //
    // Le secret DOIT être résolu exactement comme dans lib/auth.ts : le cookie
    // est chiffré avec ce secret côté NextAuth. Un déploiement qui ne définit
    // que NEXTAUTH_SECRET (nom conventionnel) laissait ce getToken lire avec un
    // secret vide : le token revenait toujours null et toute route protégée
    // (dont /profil) repartait en boucle vers /auth/signin.
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET ?? process.env.NEXT_AUTH_SECRET,
    });

    // ✅ si pas de token, redirige vers /auth/signin en conservant la destination
    // pour y revenir après connexion (ex. un lien direct vers /profil).
    if (!token) {
        const signInUrl = new URL('/auth/signin', request.url);
        signInUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
        return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
}

// ✅ Config matcher : exclut les fichiers statiques, TOUTES les routes /api/* (qui gèrent
// leur propre authentification via getServerSession/getToken) et les routes /auth/*.
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|service-worker.js|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|auth|api).*)',
    ],
};
