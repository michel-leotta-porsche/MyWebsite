<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MyWebsite: Regeln für Agenten

Freelancer-Website von Michel Leotta (DE/EN). Design-System „Systemplan“, live unter `/styleguide`.
Antworten an Michel auf Deutsch. Code-Kommentare auf Deutsch, Bezeichner auf Englisch.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Turbopack. `src/`-Verzeichnis, Alias `@/*`.
- Tailwind CSS v4 (CSS-first, keine `tailwind.config.js`). Theme in `src/app/globals.css`.
- shadcn/ui (Style `base-nova`, Primitives aus `@base-ui/react`), `cn` aus `@/lib/utils`.
- Watermelon UI als shadcn-Registry `@watermelon` (siehe `components.json`).
- Motion (`motion/react`) für Bewegung, die CSS nicht kann.
- MDX über `@next/mdx`. Zuordnung Markdown → Bausteine in `src/mdx-components.tsx`.

## Arbeitsweise

- Library-Fragen immer über Context7 klären, nicht aus dem Gedächtnis.
- Jedes npm-Paket vor der Installation prüfen: existiert es, wer veröffentlicht es, passt das Repository.
- Kleine Schritte, Commit nach jedem funktionierenden Stand.
- Vor dem Push: `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Jede sichtbare Änderung im Browser prüfen: Desktop 1440px und 375px, Hell und Dunkel, einmal mit `prefers-reduced-motion`. Kein horizontales Scrollen.
- Lighthouse ≥ 95 in allen Kategorien (mobil). `/styleguide` ist absichtlich `noindex`, dort zählt SEO nicht.
- `npm audit` meldet Funde in der ESLint-Kette von `eslint-config-next` (nur Dev). Kein `npm audit fix --force`, das stuft Next herunter.

## Design-Regeln

Quelle der Wahrheit für Werte ist `src/app/globals.css`. `src/design/tokens.ts` dokumentiert sie für `/styleguide` und muss bei Änderungen mitgezogen werden.

### Farbe

- Nur Tokens verwenden: `paper`, `paper-2`, `ink`, `ink-2`, `ink-3`, `line`, `signal`, `signal-ink`. Keine Hex-Werte, keine Tailwind-Standardfarben (`gray-500`, `blue-600`).
- Hell ist Standard, Dunkel über die Klasse `.dark` auf `<html>` (Schalter `ThemeToggle`, gespeichert in `localStorage("theme")`).
- Bernstein (`signal`) nur als Signal: aktiver Zustand, Hover-Balken, Status-Punkt, Fokus. Nie als Fläche, nie als Hintergrund eines Abschnitts.
- Text in Bernstein immer `text-signal-ink` (Kontrast auf Hell).
- Text-Kontrast ≥ 4.5:1, auch auf `paper-2`. Neue Kombinationen nachrechnen.
- Grafiken und Diagramme nutzen die Zweitpalette `chart-1` bis `chart-4` (Sanzo Wada, *A Dictionary of Color Combinations*, Nr. 288: Yellow Orange, Sepia, Taupe Brown, Black). Nie für Oberfläche, Text oder Zustände. Werte immer direkt beschriften, nicht nur über Farbe. `chart-1` hat auf Papier nur 1.8:1, deshalb Flächen in `chart-1` immer mit Kontur in `chart-4`.
- Abgleich mit Wada: `signal` entspricht „Orange Yellow“ (ΔE 1.7), `ink` entspricht „Black“ (ΔE 3.1). Papier und Grautöne kommen im Buch nicht vor; das ist gewollt (Monochrom plus Signal).

### Form

- Keine Radien, keine Schatten. `rounded-*` und `shadow-*` sind im Theme entfernt. Einzige Ausnahme: der runde Status-Punkt (`StatusDot`, `rounded-full`).
- Struktur über 1px-Haarlinien: Gruppe beginnt mit `border-t border-ink`, Einträge trennt `border-line`. Kacheln trennt eine 1px-Fuge (`gap-px bg-line`), keine Rahmen pro Kachel.
- Keine Verläufe, keine Glas-Effekte, keine Emoji als Icons, nicht alles zentriert.

### Typografie

- Schibsted Grotesk (400–700) für Headlines und Fließtext, IBM Plex Mono (400/500) für Labels, Daten, Code. Geladen über `next/font/google` in `layout.tsx`.
- Größen nur über die Utilities `t-display`, `t-h2`, `t-h3`, `t-h4`, `t-lede`, `t-body`, `t-small`, `t-label`, `t-data`, `t-wordmark`.
- `t-label` (Mono-Versalien) nur für Labels bis drei Wörter. Sätze nie in Versalien.
- Eine `h1` pro Seite (`t-display`). Fließtext max. ca. 60–68 Zeichen breit.
- Die riesige Wortmarke „MICHEL LEOTTA“ steht nur im Footer.

### Raster und Abstände

- 12-Spalten-Raster: `grid-12`. Seitenrand `px-gutter`, Spaltenabstand 20px, Abstand zwischen Sektionen `mt-section`.
- Sektionen beginnen mit `SectionHead` (Label 3 Spalten, Headline 9 Spalten).

### Bewegung

- Easing `ease-out-expo` (Standard) oder `ease-in-out-cubic`. Dauern 160 (Farbe), 500 (Balken, Pfeile, Unterstriche), 900 ms (große Wege).
- Nur `opacity`, `transform` (inkl. `translate`/`scale`) und `clip-path` animieren.
- `prefers-reduced-motion`: alles aus (global in `globals.css`; in Motion-Code `useReducedMotion`).
- Keine Animation versteckt Inhalt beim Laden. Der Endzustand ist der Ausgangszustand (Server-HTML zeigt alles).
- Hover-Muster: Bernstein-Balken 3px links + Titel rückt 6px (Index-Zeilen), Pfeil rückt 4–6px und wird `signal-ink`, Unterstrich wächst von links.
- Signatur: `ProcessRun` läuft einmal durch und treibt die Laufline unter dem Kopf (`[data-runline]`, Variable `--run`). Höchstens einmal pro Seite.

### Barrierefreiheit

- Fokus ist immer sichtbar (2px `signal-ink`, global). Nie `outline-none` ohne Ersatz.
- Klickflächen ≥ 24×24px. Icon-only-Buttons brauchen einen `sr-only`-Text.
- Dekoration (`→`, Knoten, Balken) bekommt `aria-hidden`. Status nicht nur über Farbe.
- Scrollbare Bereiche (Code, Tabelle) sind per Tastatur fokussierbar.

## Bausteine

Alles in `src/components`. Neue Seiten bauen nur aus diesen Bausteinen; neue Bausteine erst in `/styleguide` zeigen, dann verwenden.

| Baustein | Datei | Zweck |
| --- | --- | --- |
| `Button`, `ButtonMarker`, `buttonVariants` | `ui/button.tsx` | primary (ein Mal pro Ansicht) / secondary / ghost |
| `Tabs*` | `ui/tabs.tsx` | shadcn-Tabs im Systemplan-Stil |
| `TextLink`, `NavLink`, `ArrowLink`, `Arrow` | `system/text-link.tsx` | Links |
| `Badge`, `StatusDot` | `system/badge.tsx` | outline / solid / status |
| `Card`, `IndexList`, `IndexRow`, `HoverBar` | `system/card.tsx` | Karten und Projekt-Index |
| `CodeBlock`, `InlineCode`, `CopyButton` | `system/code-block.tsx`, `system/copy-button.tsx` | Code mit Kopieren |
| `Callout` | `system/callout.tsx` | note / tip / warning |
| `Table`, `THead`, `TBody`, `TR`, `TH`, `TD` | `system/table.tsx` | Tabellen, `numeric` für Zahlen |
| `Quote` | `system/quote.tsx` | Zitat mit Quelle |
| `StatGrid`, `Stat` | `system/stat.tsx` | Statistik-Kacheln |
| `Checklist`, `Node` | `system/checklist.tsx` | done / active / open |
| `ProcessRun` | `system/process-run.tsx` | Signatur-Ablauf |
| `SectionHead` | `system/section-head.tsx` | Sektionskopf |
| `SiteHeader`, `SiteFooter` | `system/site-header.tsx`, `system/site-footer.tsx` | Kopf, Fuß |
| `ThemeToggle`, `LangToggle` | `system/toggles.tsx` | Farbschema, Sprache |

## shadcn und Watermelon UI

- shadcn-Komponenten mit `npx shadcn@latest add <name>` holen, dann sofort auf Systemplan umbauen: Radien, Schatten, `ring`-Effekte und Standardfarben entfernen, Tokens einsetzen.
- Watermelon UI: `npx shadcn@latest add @watermelon/<name>`. Die Komponenten sind Showcase-Code (Federn, Radien, `h-screen`-Wrapper, teils `framer-motion` statt `motion`). Nur das Interaktionsmuster übernehmen und mit `motion/react` und Tokens neu bauen, wie bei `CopyButton` (nach `copy-confirm`). Keine neuen Abhängigkeiten ungeprüft übernehmen.

## Inhalte

- Profilinhalte stammen aus `content/profil.md` im Projektordner. Porsche-Projekte ohne interne Namen oder Nummern beschreiben.
- Texte in `/styleguide` und auf der Startseite sind Platzhalter. Zahlen dort sind Beispielwerte und dürfen nicht auf echte Seiten übernommen werden.
- DE/EN: `LangToggle` setzt bisher nur `<html lang>`. Die Übersetzung kommt mit den Seiten (Phase 3).
