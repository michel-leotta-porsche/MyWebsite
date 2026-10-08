"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

import { FrameButton, linkClass, TextButton } from "@/components/ui-base";
import { LegalLinks } from "@/components/legal";
import type { Mode } from "@/components/book";
import { ScrollBook } from "@/components/scroll-book";
import { SunAndShade } from "@/components/sun-and-shade";
import { foldGradient, FOLD_WIDTH, printedStyle } from "@/lib/book-look";
import { loadFirebase, prefetchFirebaseWhenIdle, signInNow, useLazyUser } from "@/lib/lazy-user";
import { landingBook } from "@/content/landing-book";

import drachenbaum from "../../public/photos/08-drachenbaum.jpg";
import mittagsblume from "../../public/photos/06-mittagsblume.jpg";
import markisen from "../../public/photos/markisen.jpg";
import reifen from "../../public/photos/reifen.jpg";
import schild from "../../public/photos/01-schild-am-meer.jpg";
import torii from "../../public/photos/japan/torii.jpg";

// Landing Page. Das Produkt führt sich selbst vor, ohne Bildschirmfotos:
// 1. Kopf: ein Buch auf dem Basalttisch, Scrollen schlägt es auf und blättert, wie in der Leseansicht (Feder, WebGL-Biegung).
// 2. Werkbank: vier lose Abzüge fliegen beim Scrollen an ihren Platz auf einer Doppelseite und biegen sich dabei wie Fotopapier.
// 3. Rezept: ein großes Foto, der Zettel schiebt sich darunter hervor.
// 4. Hinlegen: der Band mit Zettel für eine Person, ein Zettel kommt zurück.
// Die übrige Bewegung hängt am Scrollen (CSS scroll-driven animations, kein JavaScript dafür) und nutzt nur
// transform und opacity. Ohne Unterstützung oder bei reduzierter Bewegung steht jede Szene fertig da.

const display: CSSProperties = { fontVariationSettings: '"wdth" 75, "opsz" 96' };
const narrow: CSSProperties = { fontVariationSettings: '"wdth" 80' };
// Abzug, der auf dem Tisch liegt
const lifted = "shadow-[0_28px_50px_-18px_rgb(12_10_8/0.75),0_6px_14px_-6px_rgb(12_10_8/0.5)]";

/** Anmelden und gleich ins Bücherzimmer; wer schon angemeldet ist, geht direkt hinein */
function useEnter() {
  const user = useLazyUser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  useEffect(prefetchFirebaseWhenIdle, []);
  const enter = () => {
    const signing = signInNow();
    // Firebase noch nicht geladen: das Bücherzimmer zeigt dieselbe Anmeldung, dort öffnet sich das Fenster sicher
    if (!signing) return router.push("/zimmer");
    setBusy(true);
    signing.then(() => router.push("/zimmer")).catch(() => setBusy(false));
  };
  // Firebase schon laden, wenn der Finger oder Zeiger auf dem Knopf landet: beim Klick ist es dann meist da
  const warm = { onPointerEnter: loadFirebase, onPointerDown: loadFirebase, onFocus: loadFirebase };
  return { user, busy, enter, warm };
}

function HeaderSession() {
  const { user, busy, enter, warm } = useEnter();
  // solange Firebase prüft, bleibt die Stelle leer statt zu springen
  if (user === undefined) return <span className="text-sm">&nbsp;</span>;
  if (user)
    return (
      <Link href="/zimmer" className={`${linkClass} text-sm`}>
        Ins Bücherzimmer
      </Link>
    );
  return (
    <TextButton className="text-sm" disabled={busy} onClick={enter} {...warm}>
      Anmelden
    </TextButton>
  );
}

const enterClass = "press px-6 py-3 text-base";

function EnterButton({ label = "Mit Google anmelden" }: { label?: string }) {
  const { user, busy, enter, warm } = useEnter();
  if (user)
    return (
      <Link
        href="/zimmer"
        className={`border-on-table text-on-table hover:bg-on-table hover:text-table inline-block border font-semibold transition-colors duration-150 ${enterClass}`}
      >
        Ins Bücherzimmer
      </Link>
    );
  return (
    <FrameButton className={enterClass} disabled={busy || user === undefined} onClick={enter} {...warm}>
      {busy ? "Einen Moment …" : label}
    </FrameButton>
  );
}

/* ------------------------------------------------------------------ Papier und Leinen */

/** Bildunterschrift wie im Buch: Nummer halbfett in Tinte, Titel in grauer Tinte */
// Auf dem Telefon ist die Seite klein; Einträge mit `wide` erst ab Tablet
function Cap({ items, x, y, right = false }: { items: [number, string, "wide"?][]; x: number; y: number; right?: boolean }) {
  return (
    <p
      className={`text-ink-2 absolute w-max max-w-[62cqw] ${right ? "text-right" : ""}`}
      style={{ top: `${y}cqw`, [right ? "right" : "left"]: `${right ? 100 - x : x}cqw`, fontSize: "max(9px, 3.1cqw)", lineHeight: 1.375 }}
    >
      {items.map(([no, title, wide], k) => (
        <span key={no} className={`whitespace-nowrap ${k ? "ml-[1.2em]" : ""} ${wide ? "hidden md:inline" : ""}`}>
          <span className="text-ink font-semibold">{no}</span>
          <span className="ml-[0.6em]">{title}</span>
        </span>
      ))}
    </p>
  );
}

/** Eine Buchseite: Naturpapier, zum Bund hin der Falz */
function PageFace({ side, children, className = "" }: { side: "left" | "right"; children?: ReactNode; className?: string }) {
  return (
    <div className={`paper absolute inset-0 overflow-hidden [container-type:inline-size] ${className}`}>
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0"
        style={{ [side === "left" ? "right" : "left"]: 0, width: `${FOLD_WIDTH}cqw`, background: foldGradient(side) }}
      />
    </div>
  );
}

/** Geschlossener Band in Ringelblumen-Leinen, Maße wie der echte Einband (layout.ts, „cover“) */
function Cover({ photo, title, author, className = "" }: { photo: StaticImageData; title: string; author: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div aria-hidden className="book-shadow-closed absolute inset-0" />
      <div aria-hidden className="book-block-r absolute top-[1.2%] bottom-[0.4%] left-full w-[10px]" />
      <div className="linen bg-cloth relative aspect-[2/3] w-full overflow-hidden [container-type:inline-size]">
        <div aria-hidden className="absolute inset-y-0 left-0 w-[5cqw] bg-[rgb(12_10_8/0.08)]" />
        <div aria-hidden className="absolute inset-y-0 left-[5cqw] w-[0.25cqw] bg-[rgb(12_10_8/0.18)]" />
        <div className="absolute top-[9cqw] left-[12cqw] aspect-[4/5] w-[54cqw] shadow-[1px_2px_3px_rgb(58_39_6/0.35),0_0_0_0.5px_rgb(58_39_6/0.2)]">
          <Image src={photo} alt="" fill sizes="(min-width: 768px) 260px, 50vw" className="object-cover" />
        </div>
        <p className="text-cloth-ink absolute bottom-[22cqw] left-[12cqw] text-[11cqw] leading-[0.9] font-bold tracking-[-0.035em]" style={{ fontVariationSettings: '"wdth" 78, "opsz" 96' }}>
          {title}
        </p>
        <p className="text-cloth-ink absolute bottom-[14cqw] left-[12cqw] text-[3.6cqw] font-medium">{author}</p>
      </div>
    </div>
  );
}

/** Zettel: dünnes, vergilbtes Papier, wie der Rezeptzettel im Buch */
function Slip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`slip text-ink absolute p-4 shadow-[0_14px_24px_-12px_rgb(12_10_8/0.8)] ${className}`}>{children}</div>;
}

/* ------------------------------------------------------------------ 1. Kopf: das Buch blättert */

const wide = (f: () => void) => {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", f);
  return () => mq.removeEventListener("change", f);
};

/**
 * Passt der Kopf samt Buch in die Bildschirmhöhe? Quer auf dem Telefon, mit großer Schrift oder Zoom nicht:
 * dann steht der Kopf nicht still, sondern scrollt normal, und das Buch bekommt eine feste Größe (Härtetest B1/B2).
 * Nebenbei misst der Hook, wie viel Höhe Kopfzeile und Text brauchen, damit das Buch genau den Rest bekommt.
 */
function useHeroFit(phone: boolean) {
  const header = useRef<HTMLElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ fixed: false, used: 470 });
  useLayoutEffect(() => {
    const measure = () => {
      const h = header.current?.offsetHeight ?? 0;
      const t = text.current?.offsetHeight ?? 0;
      const vh = window.innerHeight;
      // Abstände im Raster plus Zeile „Scrollen zum Blättern“
      const used = Math.ceil(h + (phone ? t : 0) + 120);
      // Telefon: die Doppelseite braucht mindestens 170px Höhe
      const fixed = phone ? vh - used < 170 : h + t + 80 > vh || vh - 230 < 260;
      setFit((f) => (f.fixed === fixed && f.used === used ? f : { fixed, used }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (header.current) ro.observe(header.current);
    if (text.current) ro.observe(text.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [phone]);
  return { header, text, ...fit };
}

function Hero() {
  const track = useRef<HTMLElement>(null);
  // Immer die ganze Doppelseite, auch auf dem Telefon (dort kleiner, unter dem Text)
  const phone = useSyncExternalStore(wide, () => !window.matchMedia("(min-width: 768px)").matches, () => false);
  const mode: Mode = "spread";
  const leaves = landingBook.spreads.length;
  const { header, text, fixed, used } = useHeroFit(phone);
  // Papierkanten ragen links und rechts über das Buch hinaus: auf dem Telefon 28px Luft je Seite
  const width = fixed
    ? phone
      ? "calc(100vw - 56px)"
      : "min(100%, 900px)"
    : phone
      ? `min(calc(100vw - 56px), calc((100svh - ${used}px) * 4 / 3))`
      : "min(100%, calc((100svh - 230px) * 4 / 3))";
  return (
    <section
      ref={track}
      aria-labelledby="hero-h"
      data-fixed={fixed || undefined}
      className="hero-track relative"
      style={{ ["--leaves" as string]: leaves }}
    >
      <div className="hero-stick linen table-surface sticky top-0 flex min-h-svh flex-col overflow-hidden bg-table">
        <SunAndShade light="sun" />
        <header ref={header} className="relative z-20 flex items-baseline justify-between gap-6 px-4 pt-4 md:px-8 md:pt-6">
          <p className="text-on-table text-lg font-bold tracking-[-0.02em]" style={narrow}>
            Fujiventura
          </p>
          <nav aria-label="Auf dieser Seite" className="flex items-baseline gap-6 text-sm">
            <a href="#werkbank" className="text-on-table-2 decoration-mark hidden decoration-2 underline-offset-4 hover:text-on-table hover:underline md:inline">
              So entsteht ein Buch
            </a>
            <HeaderSession />
          </nav>
        </header>

        <div className="relative z-10 grid flex-1 items-center gap-8 px-4 pt-6 pb-10 md:grid-cols-12 md:gap-8 md:px-8 md:pt-0 md:pb-12">
          <div ref={text} className="md:col-span-4 md:self-end md:pb-[14svh]">
            <h1 id="hero-h" className="text-on-table leading-[0.86] font-bold tracking-[-0.04em] [text-wrap:balance]" style={{ ...display, fontSize: "clamp(52px, 7.4vw, 112px)" }}>
              Deine Fotos, gebunden.
            </h1>
            <p className="text-on-table mt-6 max-w-[26rem] text-lg leading-relaxed opacity-80 md:text-xl">
              Ein Ordner Fotos wird ein Buch, das man wirklich umblättert. Mit dem Fuji-Rezept als Zettel dazu.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
              <EnterButton />
            </div>
            <p className="text-on-table-2 mt-5 text-sm">
              Kostenlos, ein Buch zum Blättern im Browser, kein Druck. Wer einen Link bekommt, liest ohne Konto. Anmeldung über Google, siehe{" "}
              <Link href="/datenschutz" className={linkClass}>
                Datenschutz
              </Link>
              .
            </p>
          </div>
          <div className="md:col-span-8 md:col-start-5 md:pl-[4vw]">
            <ScrollBook
              book={landingBook}
              mode={mode}
              track={track}
              width={width}
            />
            <p className="hero-hint text-on-table-2 mt-3 text-center text-sm">Scrollen zum Blättern</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 2. Werkbank: Abzüge werden eine Doppelseite */

// Platz auf der Doppelseite in % (Breite 2 Seiten, Höhe 1.5 Seiten) und Startlage als loser Abzug auf dem Tisch.
// Auf dem Telefon liegt der Text über dem Buch: dort gleiten die Abzüge von links und rechts herein (phone), nicht von oben
const SLOTS = [
  { src: drachenbaum, box: [0, 0, 50, 100], from: ["6vw", "-58svh", "-9deg"], bend: 6, phone: ["-75vw", "3svh", "-8deg"], sizes: "(min-width: 768px) 30vw, 50vw" },
  { src: mittagsblume, box: [56, 6, 38, 33.8], from: ["-14vw", "-46svh", "8deg"], bend: 8, phone: ["70vw", "-2svh", "7deg"], sizes: "(min-width: 768px) 22vw, 40vw" },
  { src: markisen, box: [56, 48, 18, 36], from: ["-30vw", "40svh", "-7deg"], bend: 9, phone: ["80vw", "4svh", "-6deg"], sizes: "(min-width: 768px) 12vw, 22vw" },
  { src: reifen, box: [76, 48, 18, 36], from: ["4vw", "52svh", "11deg"], bend: 8, phone: ["70vw", "6svh", "9deg"], sizes: "(min-width: 768px) 12vw, 22vw" },
] as const;

// Wölbung der aufgeschlagenen Seiten: am Bund sinken Ober- und Unterkante um so viel Prozent der Höhe ein, nach außen läuft es aus.
// Bewusst knapp; mehr wirkt wie ein Effekt statt wie Papier.
const SAG = { top: 1.2, bottom: 0.8 };
const CURVE_STEPS = 8;

/** clip-path der Doppelseite. `loose`: dieselben Punkte weit draußen, damit die Abzüge im Flug nicht beschnitten werden */
function pageCurve(loose: boolean) {
  // von außen links zum Bund und weiter nach außen rechts; u = Abstand vom Bund in Seitenbreiten
  const xs = Array.from({ length: 2 * CURVE_STEPS + 1 }, (_, k) => (k * 100) / (2 * CURVE_STEPS));
  const sag = (x: number, s: number) => s * (1 - Math.abs(x - 50) / 50) ** 2;
  const pt = (x: number, y: number) => (loose ? `${x * 5 - 200}% ${y * 5 - 200}%` : `${+x.toFixed(2)}% ${+y.toFixed(3)}%`);
  const top = xs.map((x) => pt(x, sag(x, SAG.top)));
  const bottom = [...xs].reverse().map((x) => pt(x, 100 - sag(x, SAG.bottom)));
  return `polygon(${[...top, ...bottom].join(", ")})`;
}

// So viele Streifen je Hälfte: der Abzug biegt sich an ihren Kanten wie Fotopapier im Luftzug
const STRIPS = 5;

/**
 * Ein Streifen des Abzugs. Alle Streifen liegen nebeneinander im Abzug (keine Verschachtelung, die Safari nicht zeichnet);
 * jeder dreht sich um seine Kante zur Mitte und rückt so weit vor, dass er an den inneren Nachbarn anschließt (globals.css).
 */
function Strip({ src, sizes, side, j }: { src: StaticImageData; sizes: string; side: "l" | "r"; j: number }) {
  const outer = j === STRIPS;
  // Lage im ganzen Bild, in Streifenbreiten von links
  const at = side === "r" ? STRIPS + j - 1 : STRIPS - j;
  return (
    <div
      className={`bench-hinge-${side} absolute inset-y-0`}
      style={{
        left: `${(at * 100) / (2 * STRIPS)}%`,
        width: `${100 / (2 * STRIPS)}%`,
        transformOrigin: side === "r" ? "left center" : "right center",
        ["--j" as string]: j,
        // Summen über die inneren Nachbarn: 1 + 2 + … und 1² + 2² + … bis j − 1
        ["--s1" as string]: ((j - 1) * j) / 2,
        ["--s2" as string]: ((j - 1) * j * (2 * j - 1)) / 6,
      }}
    >
      {/* Papierrand, solange der Abzug lose ist: nur oben, unten und außen, damit zwischen den Streifen kein Weiß durchblitzt */}
      <div aria-hidden className="bench-border absolute -inset-y-[5px]" style={{ left: side === "l" && outer ? -5 : -1, right: side === "r" && outer ? -5 : -1 }}>
        <div className="bg-paper absolute inset-x-0 top-0 h-[6px]" />
        <div className="bg-paper absolute inset-x-0 bottom-0 h-[6px]" />
        {outer && <div className={`bg-paper absolute inset-y-0 w-[6px] ${side === "l" ? "left-0" : "right-0"}`} />}
      </div>
      {/* die Streifen überlappen um einen Pixel, damit keine Fuge blitzt */}
      <div className="absolute inset-y-0 -right-px -left-px overflow-hidden">
        <div className="absolute inset-y-0" style={{ width: `${2 * STRIPS * 100}%`, left: `${-at * 100}%` }}>
          {/* sofort laden: Safari lädt Bilder in gedrehten, verschobenen Ebenen sonst nicht zuverlässig nach */}
          <Image src={src} alt="" fill sizes={sizes} loading="eager" className="object-cover" />
        </div>
      </div>
      {/* Licht von links oben: rechts aufgebogene Streifen glänzen, links aufgebogene liegen im Schatten */}
      <div aria-hidden className={`bench-light-${side} absolute inset-0 opacity-0 ${side === "r" ? "bg-paper" : "bg-[rgb(12_10_8)]"}`} />
    </div>
  );
}

/** Der Abzug als biegsames Blatt: je Hälfte STRIPS Streifen, von der Mitte nach außen gezählt */
function Sheet({ src, sizes }: { src: StaticImageData; sizes: string }) {
  const js = Array.from({ length: STRIPS }, (_, i) => i + 1);
  return (
    <>
      {js.map((j) => (
        <Strip key={`l${j}`} src={src} sizes={sizes} side="l" j={j} />
      ))}
      {js.map((j) => (
        <Strip key={`r${j}`} src={src} sizes={sizes} side="r" j={j} />
      ))}
    </>
  );
}

function Workbench() {
  return (
    <section id="werkbank" aria-labelledby="bench-h" className="bench-track relative scroll-mt-0">
      <div className="linen table-surface sticky top-0 flex min-h-svh flex-col justify-center overflow-hidden bg-table-deep px-4 py-12 md:px-8 md:py-10">
        <div className="relative z-10 grid items-center gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <h2 id="bench-h" className="text-on-table text-5xl leading-[0.9] font-bold tracking-[-0.035em] md:text-7xl" style={display}>
              Reinziehen.
              <br />
              Fertig gesetzt.
            </h2>
            <p className="text-on-table mt-6 max-w-[28rem] text-base leading-relaxed opacity-80 md:text-lg">
              Fotos vom Handy, von der Fuji oder aus Lightroom auf die Werkbank ziehen, auch HEIC und DNG. Nach ein, zwei Sekunden stehen sie als
              Doppelseiten da, nach Aufnahmezeit geordnet. Ortsdaten fallen beim Hochladen weg.
            </p>
          </div>
        <div className="relative z-0 mx-auto w-full max-w-[min(100%,calc((100svh-140px)*4/3))] md:col-span-8 md:col-start-5 md:mr-0">
          <div
            className="relative aspect-[4/3] w-full [container-type:inline-size]"
            style={{ ["--loose" as string]: pageCurve(true), ["--curve" as string]: pageCurve(false), ...printedStyle }}
          >
            {/* Buchblock links und rechts, darunter der Schatten des aufgeschlagenen Buchs */}
            <div aria-hidden className="book-block-l absolute top-[0.6%] right-full bottom-[0.6%] w-[1.2cqw]" />
            <div aria-hidden className="book-block-r absolute top-[0.6%] bottom-[0.6%] left-full w-[1.2cqw]" />
            <div aria-hidden className="book-shadow-open absolute inset-0" />
            {/* Die Seiten wölben sich zum Bund hin; die Form greift erst, wenn alle Abzüge liegen (globals.css) */}
            <div className="bench-book absolute inset-0 [perspective:1400px]">
            {/* die Doppelseite liegt schon da und wartet auf ihre Bilder */}
            <div className="bench-paper absolute inset-0 grid grid-cols-2">
              <div className="relative">
                <PageFace side="left" />
              </div>
              <div className="relative">
                <PageFace side="right">
                  <div className="bench-caps absolute inset-0">
                    <Cap items={[[1, "Drachenbaum", "wide"], [2, "Erst mittags offen"]]} x={88} y={62} right />
                    <Cap items={[[3, "Eingerollt"], [4, "Platt"]]} x={88} y={130} right />
                  </div>
                </PageFace>
              </div>
            </div>
            {SLOTS.map((s, i) => (
              <div
                key={i}
                className="bench-print absolute [transform-style:preserve-3d]"
                style={{
                  left: `${s.box[0]}%`,
                  top: `${s.box[1]}%`,
                  width: `${s.box[2]}%`,
                  height: `${s.box[3]}%`,
                  ["--fx" as string]: s.from[0],
                  ["--fy" as string]: s.from[1],
                  ["--fr" as string]: s.from[2],
                  ["--px" as string]: s.phone[0],
                  ["--py" as string]: s.phone[1],
                  ["--pr" as string]: s.phone[2],
                  ["--i" as string]: i,
                  ["--b" as string]: s.bend,
                  // Breite eines Streifens: ein Zehntel des Abzugs (cqw misst die Bühne)
                  ["--w" as string]: `${s.box[2] / (2 * STRIPS)}cqw`,
                }}
              >
                <div aria-hidden className="bench-shadow absolute inset-0 opacity-0 shadow-[0_60px_80px_-20px_rgb(12_10_8/0.6)]" />
                <div aria-hidden className="bench-border absolute -inset-[5px] shadow-[0_18px_30px_-12px_rgb(12_10_8/0.6)]" />
                <Sheet src={s.src} sizes={s.sizes} />
              </div>
            ))}
            {/* Falz und Papier über den eingeklebten Bildern: erst wenn alles liegt, wie die Bildunterschriften */}
            <div aria-hidden className="bench-caps pointer-events-none absolute inset-0">
              {/* Kanten der eingeklebten Abzüge laufen ins Papier aus; der erste liegt im Anschnitt und hat keine */}
              {SLOTS.slice(1).map((s, i) => (
                <div
                  key={i}
                  className="print-edge"
                  style={{ left: `${s.box[0]}%`, top: `${s.box[1]}%`, width: `${s.box[2]}%`, height: `${s.box[3]}%`, right: "auto", bottom: "auto" }}
                />
              ))}
              <div className="printed" />
              {(["left", "right"] as const).map((side) => (
                <div
                  key={side}
                  className="absolute inset-y-0"
                  style={{ [side === "left" ? "right" : "left"]: "50%", width: `${FOLD_WIDTH / 2}cqw`, background: foldGradient(side) }}
                />
              ))}
            </div>
            </div>
          </div>
          <p className="text-on-table-2 relative mt-6 text-sm">
            <span className="bench-count-a">4 Fotos, nach Aufnahmezeit</span>
            <span className="bench-count-b">Eine Doppelseite, ohne einen Handgriff</span>
          </p>
        </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 3. Rezept */

function Recipe() {
  return (
    <section aria-labelledby="recipe-h" className="linen table-surface relative overflow-hidden bg-table px-4 py-24 md:px-8 md:py-36">
      <div className="grid gap-6 md:grid-cols-12 md:gap-8">
        <h2 id="recipe-h" className="text-on-table text-5xl leading-[0.9] font-bold tracking-[-0.035em] md:col-span-7 md:text-7xl" style={display}>
          Das Rezept liegt bei.
        </h2>
        <p className="text-on-table text-lg leading-relaxed opacity-80 md:col-span-4 md:col-start-9 md:self-end">
          Filmsimulation, Körnung, Weißabgleich: Was die Fuji in die Datei schreibt, liegt als Zettel unter dem Foto. Lightroom-Presets nimmt man
          gleich als .xmp mit.
        </p>
      </div>

      <figure className="relative mx-auto mt-14 max-w-[1040px] md:mt-20">
        <div className={`bg-paper w-[86%] p-[6px] md:w-[52%] md:p-[10px] ${lifted} -rotate-[1.5deg]`}>
          <div className="relative aspect-[2/3] w-full">
            <Image src={schild} alt="Schild über der Bucht" fill sizes="(min-width: 768px) 520px, 86vw" className="object-cover" />
          </div>
        </div>
        {/* Zettel schiebt sich unter dem Abzug hervor, sobald er ins Bild kommt */}
        <Slip className="reveal-slip relative mt-[-30%] ml-auto w-[92%] rotate-[3deg] p-5 md:absolute md:right-0 md:bottom-[12%] md:mt-0 md:w-[50%] md:p-8">
          <span className="text-ink-2 block text-xs md:text-sm">Rezept · Beispielwerte</span>
          <span className="mt-1 block text-2xl font-bold tracking-[-0.02em] md:text-4xl" style={narrow}>
            Classic Chrome
          </span>
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-sm md:text-base">
            <dt className="text-ink-2">Dynamik</dt>
            <dd>DR200</dd>
            <dt className="text-ink-2">Lichter · Schatten</dt>
            <dd>−1 · +1</dd>
            <dt className="text-ink-2">Farbe</dt>
            <dd>+2</dd>
            <dt className="text-ink-2">Körnung</dt>
            <dd className="flex items-center gap-2">
              <span aria-hidden className="flex gap-[3px]">
                <span className="block h-2 w-5 bg-ink" />
                <span className="block h-2 w-5 bg-ink/15" />
              </span>
              schwach, klein
            </dd>
            <dt className="text-ink-2">Weißabgleich</dt>
            <dd>Auto · R+1 B−2</dd>
          </dl>
        </Slip>
      </figure>
    </section>
  );
}

/* ------------------------------------------------------------------ 4. Hinlegen */

const DETAILS = [
  { title: "Frei, wenn du willst", text: "Bilder schieben, zuschneiden, über den Bund ziehen. Text in vier Schriften, Linien, Klebestreifen, ein Stift. Jeder Handgriff lässt sich zurücknehmen." },
  { title: "Kein Profil, kein Feed", text: "Ein Buch sieht nur, wer den Link hat. Jeden Link kannst du einzeln zurückziehen." },
] as const;

function Share() {
  return (
    <section aria-labelledby="share-h" className="linen table-surface relative overflow-hidden bg-table-deep px-4 py-24 md:px-8 md:py-36">
      <div className="grid items-center gap-16 md:grid-cols-12 md:gap-8">
        <div aria-hidden className="relative mx-auto aspect-[1/1] w-full max-w-[560px] md:col-span-6 md:mx-0">
          <Cover photo={torii} title="Japan" author="Michel Leotta" className="absolute top-[2%] left-[4%] w-[54%] -rotate-[4deg]" />
          <Slip className="reveal-slip top-[10%] right-[2%] w-[46%] rotate-[3deg] text-[15px]">
            Für Jana, von Michel
            <span className="text-ink-2 mt-1.5 block font-mono text-[11px] break-all">fujiventura.web.app/b?t=…</span>
          </Slip>
          <Slip className="reveal-slip reveal-late right-[8%] bottom-[8%] w-[56%] -rotate-[2deg] text-[15px] leading-snug">
            <span className="text-ink-2 block text-xs">Zettel zu Tafel 7, von Jana</span>
            Das Tor im Regen hätte ich gern an der Wand.
          </Slip>
        </div>
        <div className="md:col-span-5 md:col-start-8">
          <h2 id="share-h" className="text-on-table text-5xl leading-[0.9] font-bold tracking-[-0.035em] md:text-7xl" style={display}>
            Hinlegen, nicht posten.
          </h2>
          <p className="text-on-table mt-6 max-w-[30rem] text-lg leading-relaxed opacity-80">
            Für jede Person ein eigener Link. Sie blättert ohne Konto, auf dem Telefon Seite für Seite, und lässt dir Zettel und Eselsohren da, die
            nur du liest.
          </p>
          <ul className="border-on-table-2/30 mt-12 border-t">
            {DETAILS.map((d) => (
              <li key={d.title} className="border-on-table-2/30 border-b py-6">
                <h3 className="text-on-table text-xl font-semibold tracking-[-0.015em]">{d.title}</h3>
                <p className="text-on-table-2 mt-2 max-w-[30rem] text-base leading-relaxed">{d.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Schluss */

function Closing() {
  return (
    <>
      <section aria-labelledby="end-h" className="linen table-surface relative overflow-hidden bg-table px-4 pt-24 pb-20 md:px-8 md:pt-40 md:pb-28">
        <SunAndShade light="sun" />
        <div className="relative z-20">
          <h2 id="end-h" className="text-on-table max-w-[12ch] leading-[0.86] font-bold tracking-[-0.04em]" style={{ ...display, fontSize: "clamp(56px, 9vw, 144px)" }}>
            Leg deinen Sommer auf den Tisch.
          </h2>
          <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-4">
            <EnterButton label="Erstes Buch anlegen" />
            <p className="text-on-table-2 text-sm">
              Kostenlos, Anmeldung mit Google. Bücher sieht nur, wem du einen Link gibst.{" "}
              <Link href="/datenschutz" className={linkClass}>
                Datenschutz
              </Link>
            </p>
          </div>
        </div>
      </section>
      <footer className="linen table-surface relative bg-table px-4 pb-10 text-sm text-on-table-2 md:px-8">
        <div className="border-on-table-2/25 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t pt-6">
          <p>
            <span className="text-on-table font-semibold">Fujiventura</span> · Beispielfotos von Michel Leotta
          </p>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <nav aria-label="Räume" className="flex gap-x-5">
              <Link href="/zimmer" className="decoration-mark decoration-2 underline-offset-4 hover:text-on-table hover:underline">
                Bücherzimmer
              </Link>
            </nav>
            <LegalLinks />
          </div>
        </div>
      </footer>
    </>
  );
}

export function Landing() {
  return (
    // Safari zählt in 3D gedrehte Abzüge sonst zur Seitenhöhe mit, auch wenn ihr Abschnitt sie abschneidet;
    // clip schneidet ab, ohne einen Scrollbereich zu bilden, das Kleben der Szenen bleibt erhalten
    <main className="overflow-clip">
      <Hero />
      <Workbench />
      <Recipe />
      <Share />
      <Closing />
    </main>
  );
}
