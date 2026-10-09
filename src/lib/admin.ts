// Wer Meldungen sieht und Links sperren darf. Muss zu isAdmin() in firestore.rules passen.
export const ADMIN_EMAILS = ["michel.julian.leotta@gmail.com"];

export const isAdmin = (u: { email?: string | null } | null | undefined) => !!u?.email && ADMIN_EMAILS.includes(u.email.toLowerCase());
