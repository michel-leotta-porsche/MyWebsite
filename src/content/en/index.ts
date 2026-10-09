// Englische Fassung: deutscher Text aus dem Code → englischer Text. t() in lib/i18n.ts liest hier.
// Je Bereich eine Datei; derselbe deutsche Text darf in mehreren stehen, muss dann aber gleich übersetzt sein (Test).
// {name} bleibt stehen und wird beim Aufruf ersetzt. scripts/test/i18n.test.ts meldet Texte ohne Eintrag.
//
// Begriffe, damit alle Bereiche gleich sprechen:
// Bücherzimmer = Library · Werkbank = Workbench · Bühne = Stage · Fotostudio = Photo studio · Zettel = note
// Eselsohr = dog-ear · Tafel = plate · Doppelseite = spread · Bund = gutter · Einband/Leinen = cover/cloth
// hinlegen (ein Buch für jemanden) = hand over · Rezept (Fuji) = recipe · Look = look · Feinschliff = fine-tuning
// Anrede: du → you, locker und knapp wie im Deutschen. Keine Gedankenstriche, wo das Deutsche keine hat.

import { CAMERA } from "./camera";
import { DEVELOP } from "./develop";
import { LEGAL } from "./legal";
import { LIBRARY } from "./library";
import { STAGE } from "./stage";
import { START } from "./start";
import { WORKBENCH } from "./workbench";

export const PARTS: Record<string, Record<string, string>> = { START, LEGAL, STAGE, WORKBENCH, LIBRARY, DEVELOP, CAMERA };

export const EN: Record<string, string> = Object.assign({}, ...Object.values(PARTS));
