import data from "@/content/qfd.json";

// Ergebnisse des simulierten QFD-Workshops (Workflow „fujiventura-qfd“) und die Rechnungen des House of Quality.
// Gewicht einer Kundenanforderung = Bedeutung × Verbesserungsquote (Planwert / heute) × Verkaufsschwerpunkt.
// Technische Bedeutung = Σ relatives Gewicht × Beziehungsstärke (9 / 3 / 1).

export const COMPETITORS = ["CEWE", "Popsa", "Google Fotos", "Blurb", "Fujiventura heute"] as const;
export type Competitor = (typeof COMPETITORS)[number];

export type Evidence = { text: string; source: string };
export type PainTheme = { id: string; theme: string; description: string; competitors: string[]; evidence: Evidence[] };
export type MustHave = { need: string; why: string; fujiventuraToday: string };
export type Persona = { id: string; name: string; profile: string; devices: string; keyQuote: string };
export type Statement = { id: string; persona: string; text: string; situation: string };
export type Kano = "M" | "O" | "A" | "I";
export type Requirement = {
  id: string;
  group: string;
  text: string;
  kano: Kano;
  importance: number;
  rationale: string;
  statements: string[];
  painThemes: string[];
  perception: Record<Competitor, number>;
  goal: number;
  salesPoint: number;
};
export type Characteristic = {
  id: string;
  name: string;
  unit: string;
  direction: "up" | "down" | "target";
  current: string;
  target: string;
  benchmark: Record<string, string>;
  measure: string;
};
export type Relation = { req: string; tech: string; strength: 1 | 3 | 9 };
export type Roof = { a: string; b: string; correlation: "++" | "+" | "-" | "--"; note: string };
export type Feature = {
  id: string;
  name: string;
  description: string;
  techs: string[];
  reqs: string[];
  kano: "M" | "O" | "A";
  effort: "S" | "M" | "L";
  phase: number;
  why: string;
};
export type SurveyItem = { req: string; functional: string; dysfunctional: string };

type Data = {
  date: string;
  market: {
    summary: string;
    painThemes: PainTheme[];
    mustHaves: MustHave[];
    gaps: string[];
    competitors: { name: string; segment: string; oneLine: string }[];
  };
  voc: { personas: Persona[]; statements: Statement[] };
  reqs: { groups: { id: string; name: string }[]; requirements: Requirement[]; method: string };
  hoq: { characteristics: Characteristic[]; relations: Relation[]; roof: Roof[]; notes: string };
  features: { features: Feature[]; survey: SurveyItem[]; next: string; caveats: string };
};

export const qfd = data as unknown as Data;

export const KANO: Record<Kano, { label: string; short: string; hint: string }> = {
  M: { label: "Basismerkmal", short: "Basis", hint: "fällt nur auf, wenn es fehlt" },
  O: { label: "Leistungsmerkmal", short: "Leistung", hint: "je besser, desto zufriedener" },
  A: { label: "Begeisterungsmerkmal", short: "Begeisterung", hint: "wird nicht erwartet, begeistert aber" },
  I: { label: "Indifferent", short: "egal", hint: "macht keinen Unterschied" },
};

/** Gewichte der Kundenanforderungen (absolut und in %) */
export function weights(reqs: Requirement[]) {
  const abs = reqs.map((r) => {
    const today = Math.max(1, r.perception["Fujiventura heute"] ?? 1);
    const ratio = r.goal / today;
    return { id: r.id, ratio, abs: r.importance * ratio * r.salesPoint };
  });
  const sum = abs.reduce((a, b) => a + b.abs, 0) || 1;
  return new Map(abs.map((w) => [w.id, { ...w, rel: (100 * w.abs) / sum }]));
}

/** Technische Bedeutung je Merkmal (absolut und in %) */
export function techImportance(reqs: Requirement[], chars: Characteristic[], rel: Relation[]) {
  const w = weights(reqs);
  const abs = chars.map((c) => ({
    id: c.id,
    abs: rel.filter((r) => r.tech === c.id).reduce((a, r) => a + (w.get(r.req)?.rel ?? 0) * r.strength, 0),
  }));
  const sum = abs.reduce((a, b) => a + b.abs, 0) || 1;
  return new Map(abs.map((t) => [t.id, { ...t, rel: (100 * t.abs) / sum }]));
}

/** Bedeutung einer Funktion: Summe der technischen Bedeutung der Merkmale, die sie bewegt */
export function featureScore(f: Feature, tech: Map<string, { rel: number }>) {
  return f.techs.reduce((a, t) => a + (tech.get(t)?.rel ?? 0), 0);
}

/** Auswertung des Kano-Fragebogens nach der klassischen Tabelle (funktional × dysfunktional) */
export const ANSWERS = ["Das würde mich sehr freuen", "Das setze ich voraus", "Das ist mir egal", "Das könnte ich hinnehmen", "Das würde mich stören"] as const;
// Zeilen: funktionale Antwort, Spalten: dysfunktionale Antwort. A, O, M, I, R (Rückweisung), Q (fraglich)
const TABLE = [
  ["Q", "A", "A", "A", "O"],
  ["R", "I", "I", "I", "M"],
  ["R", "I", "I", "I", "M"],
  ["R", "I", "I", "I", "M"],
  ["R", "R", "R", "R", "Q"],
] as const;
export const kanoOf = (functional: number, dysfunctional: number) => TABLE[functional]?.[dysfunctional] ?? "Q";
