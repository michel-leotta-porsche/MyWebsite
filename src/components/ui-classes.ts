// Klassen als reine Zeichenketten, ohne "use client": Server-Komponenten (Rechtsseiten, 404) brauchen sie auch.

/**
 * Auf Touch wächst die Tippfläche unsichtbar auf mindestens 44 pt Höhe (Apple HIG), ohne das Layout zu verschieben.
 * Nebeneinanderliegende Links brauchen dafür mindestens 16px Abstand, sonst überlappen die Flächen.
 */
export const hitClass = "relative pointer-coarse:before:absolute pointer-coarse:before:-inset-x-2 pointer-coarse:before:-inset-y-3";

// Gelb ist Signal: der Unterstrich erscheint erst beim Zeigen oder mit dem Fokus
export const linkClass = `${hitClass} text-on-table decoration-mark decoration-2 underline-offset-4 hover:underline focus-visible:underline disabled:opacity-50`;
