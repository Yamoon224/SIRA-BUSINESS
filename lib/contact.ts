/**
 * Coordonnées du support, source unique pour l'app entreprise.
 *
 * Les pages affichaient des valeurs de maquette (« support@goriya.com »,
 * « +33 1 23 45 67 89 ») qui ne correspondaient ni à la boîte réellement
 * configurée côté backend (MAIL_FROM_ADDRESS=support@goriya.net, SMTP
 * Hostinger) ni au numéro utilisé par les autres espaces (admin, candidat).
 *
 * Surchargeable au déploiement via NEXT_PUBLIC_SUPPORT_EMAIL /
 * NEXT_PUBLIC_SUPPORT_PHONE, sans retoucher les composants.
 */

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@goriya.net"

/** Format lisible, tel qu'affiché. */
export const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+225 07 58 70 06 92"

/** Version composable pour un lien `tel:` (sans espaces). */
export const SUPPORT_PHONE_HREF = `tel:${SUPPORT_PHONE.replace(/[^\d+]/g, "")}`

export const SUPPORT_EMAIL_HREF = `mailto:${SUPPORT_EMAIL}`

/** Lien wa.me : indicatif + numéro, sans le « + » ni les espaces. */
export const SUPPORT_WHATSAPP_HREF = `https://wa.me/${SUPPORT_PHONE.replace(/[^\d]/g, "")}`
