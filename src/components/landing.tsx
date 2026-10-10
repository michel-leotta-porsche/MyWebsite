"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { Aperture, ArrowRight, Film, Pipette } from "lucide-react";

import { Library } from "@/components/books";
import { hitClass, linkClass } from "@/components/ui-base";
import { buttonClass } from "@/components/ui/button";
import { LegalLinks } from "@/components/legal";
import { OwnBook } from "@/components/sample-book";
import { SunAndShade } from "@/components/sun-and-shade";
import { ClosedBook } from "@/components/table";
import { foldGradient, FOLD_WIDTH, printedStyle } from "@/lib/book-look";
import { APPLE_READY, SignInButtons } from "@/components/sign-in-buttons";
import { signInError } from "@/lib/errors";
import type { SignInProvider } from "@/lib/firebase";
import { loadFirebase, prefetchFirebaseWhenIdle, signInNow, useLazyUser } from "@/lib/lazy-user";
import { APP_FEATURES, CLIPS, HOWTO, SECTIONS, TESTFLIGHT_URL, cueAt, type Clip as ClipData, type SectionId } from "@/lib/landing";
import { FEATURES_PATH } from "@/lib/features";
import { sampleBook } from "@/lib/sample-book";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { de, useLang, useT } from "@/lib/i18n";

import drachenbaum from "../../public/photos/08-drachenbaum.jpg";
import mittagsblume from "../../public/photos/06-mittagsblume.jpg";
import markisen from "../../public/photos/markisen.jpg";
import reifen from "../../public/photos/reifen.jpg";

// Landing Page (#264). Freunde öffnen den Link auf dem Telefon; sie sollen erst blättern, dann gefragt werden:
// 1. Blätter mal: das Beispielbuch Fuerteventura liegt auf dem Basalttisch, ein Tipp schlägt es auf, ohne Konto.
// 2. Mach dein eigenes: Anmeldung.
// 3. Was Calima kann: Werkbank (Abzüge fliegen beim Scrollen an ihren Platz), Rezept und Hinlegen mit Michels Clips,
//    zum Schluss ehrlich, was nur die iPhone-App kann (Kamera).
// 4. So geht’s: drei Schritte, jeder führt in die Hilfe.
// Die Werkbank hängt am Scrollen (CSS scroll-driven animations) und nutzt nur transform und opacity.
// Ohne Unterstützung oder bei reduzierter Bewegung steht sie fertig da; die Clips laufen dann nicht von selbst.

export const display: CSSProperties = { fontVariationSettings: '"wdth" 75, "opsz" 96' };
export const narrow: CSSProperties = { fontVariationSettings: '"wdth" 80' };
// Wortlaut auf Deutsch, t() übersetzt beim Zeichnen
const PROVIDERS = APPLE_READY ? de("Apple oder Google") : "Google";
// Abzug, der auf dem Tisch liegt
const lifted = "shadow-[0_28px_50px_-18px_rgb(12_10_8/0.75),0_6px_14px_-6px_rgb(12_10_8/0.5)]";
// Große Überschrift eines Abschnitts oder einer Funktion
// wächst fließend von 48 px (Telefon) bis 84 px bei 1280 px, ab da bleibt die Spalte gleich breit und die Schrift auch
export const displayHeading = "text-on-table text-[clamp(3rem,1.75rem+4.4vw,5.25rem)] leading-[0.9] font-bold tracking-[-0.035em]";

const book = sampleBook();

/** Anmelden und gleich ins Bücherzimmer; wer schon angemeldet ist, geht direkt hinein */
function useEnter() {
  const user = useLazyUser();
  const router = useRouter();
  const [busy, setBusy] = useState<SignInProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(prefetchFirebaseWhenIdle, []);
  const enter = (provider: SignInProvider) => {
    const signing = signInNow(provider);
    // Firebase noch nicht geladen: das Bücherzimmer zeigt dieselbe Anmeldung, dort öffnet sich das Fenster sicher
    if (!signing) return router.push("/zimmer");
    setBusy(provider);
    setError(null);
    signing
      .then(() => router.push("/zimmer"))
      .catch((e) => {
        setBusy(null);
        setError(signInError(e));
      });
  };
  // Firebase schon laden, wenn der Finger oder Zeiger auf dem Knopf landet: beim Klick ist es dann meist da
  return { user, busy, error, enter, warm: () => void loadFirebase() };
}

function HeaderSession() {
  const user = useLazyUser();
  const t = useT();
  // Angemeldete gehen gleich hinein; alle anderen blättern erst, die Anmeldung kommt im zweiten Abschnitt (#264)
  if (!user) return null;
  return (
    <Link href="/zimmer" className={buttonClass("quiet", "sm")}>
      {t("Ins Bücherzimmer")}
    </Link>
  );
}

/** label: ein einzelner Link ins Bücherzimmer (Schluss der Seite); ohne label die Anmeldung mit Apple und Google */
export function EnterButton({ label }: { label?: string }) {
  const { user, busy, error, enter, warm } = useEnter();
  const t = useT();
  if (user || label)
    return (
      <Link href="/zimmer" className={buttonClass("cloth", "md", "px-7")}>
        {user ? t("Ins Bücherzimmer") : label}
      </Link>
    );
  return (
    <span className="flex w-full flex-col items-start gap-2">
      <SignInButtons busy={busy} disabled={user === undefined} onPick={enter} warm={warm} tone="cloth" />
      {error && (
        <span role="alert" className="text-on-table max-w-xs text-sm">
          {error}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ Papier und Leinen */

/** Bildunterschrift wie im Buch: Nummer halbfett in Tinte, Titel in grauer Tinte */
// Auf dem Telefon ist die Seite klein; Einträge mit `wide` erst ab Tablet
function Cap({ items, x, y, right = false }: { items: [number, string, "wide"?][]; x: number; y: number; right?: boolean }) {
  return (
    <p
      className={`text-ink-2 absolute w-max max-w-[62cqw] ${right ? "text-right" : ""}`}
      style={{ top: `${y}cqw`, [right ? "right" : "left"]: `${right ? 100 - x : x}cqw`, fontSize: "max(9px, 2.2cqw)", lineHeight: 1.375 }}
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

/** Zettel: dünnes, vergilbtes Papier, wie der Rezeptzettel im Buch */
function Slip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`slip text-ink absolute rounded-cut p-4 shadow-[0_14px_24px_-12px_rgb(12_10_8/0.8)] ${className}`}>{children}</div>;
}

/**
 * Ein Clip von Michel als stiller Loop, wie ein Abzug auf dem Tisch. Lädt erst kurz bevor er ins Bild kommt und hält an,
 * wenn er hinausscrollt. Auf der deutschen Seite laufen deutsche Untertitel mit (die Schrift im Bild ist englisch).
 * Bei reduzierter Bewegung startet er nicht von selbst; dann gibt es die Bedienleiste.
 */
function Clip({ clip, label, className = "" }: { clip: ClipData; label: string; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const lang = useLang();
  const [line, setLine] = useState<string | null>(null);
  // Stromsparmodus oder Browser verbieten das Abspielen: dann wenigstens die Bedienleiste
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v || reduce) return;
    // iOS spielt nur stumm von selbst ab; das Attribut allein setzt React nicht zuverlässig
    v.muted = true;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => setBlocked(true));
        else v.pause();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(v);
    return () => {
      io.disconnect();
      v.pause();
    };
  }, [reduce]);

  return (
    <div className={`bg-paper p-[6px] md:p-[8px] ${lifted} ${className}`}>
      <div className="bg-table-deep relative aspect-[9/16] w-full overflow-hidden">
        <video
          ref={video}
          src={clip.src}
          poster={clip.poster}
          muted
          loop
          playsInline
          preload="none"
          controls={reduce || blocked}
          aria-label={label}
          onTimeUpdate={(e) => setLine(lang === "de" ? cueAt(clip.cues, e.currentTarget.currentTime) : null)}
          className="absolute inset-0 size-full object-cover"
        />
        {lang === "de" && line && (
          // direkt unter der englischen Zeile im Bild (oben links); unten liegen auf der Landing die Zettel
          <p aria-hidden className="pointer-events-none absolute top-[19%] left-[8%] max-w-[80%] text-[13px] leading-[1.6] md:text-[15px]">
            <span className="bg-[rgb(12_10_8/0.72)] px-2 py-0.5 text-on-table [box-decoration-break:clone]">{line}</span>
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 1. Blätter mal */

function Hero() {
  const t = useT();
  return (
    <section id="blaettern" aria-labelledby="blaettern-h" className="linen table-surface relative flex min-h-svh flex-col overflow-hidden bg-table">
      <SunAndShade light="sun" />
      <header className="relative z-20 flex items-baseline justify-between gap-6 px-page pt-[max(1rem,env(safe-area-inset-top))] md:pt-6 xl:pt-8">
        <p className="text-on-table text-lg font-bold md:text-xl tracking-[-0.02em]" style={narrow}>
          Calima
        </p>
        <nav aria-label={t("Auf dieser Seite")} className="flex items-baseline gap-5 text-sm md:gap-6">
          <Link href={FEATURES_PATH} className="text-on-table-2 decoration-mark decoration-2 underline-offset-4 hover:text-on-table hover:underline">
            {t("Was Calima kann")}
          </Link>
          <HeaderSession />
        </nav>
      </header>

      <div className="relative z-10 grid flex-1 content-center items-center gap-4 px-page pt-8 pb-10 md:grid-cols-12 md:gap-8 md:pt-0 md:pb-12 flat:grid-cols-12">
        <div className="md:col-span-5 md:pb-[8svh] flat:col-span-5">
          <h1 id="blaettern-h" className="word-rise text-on-table leading-[0.86] font-bold tracking-[-0.04em]" style={{ ...display, fontSize: "clamp(52px, 7.4vw, 112px)" }}>
            {t("Blätter mal.")}
          </h1>
          <p className="word-rise text-on-table mt-4 max-w-[26rem] text-lg leading-relaxed opacity-80 md:mt-6 md:text-xl" style={{ ["--i" as string]: 2 }}>
            {t("Ein Fotobuch zum Umblättern, von Michel. Kostenlos, ohne Konto zum Anschauen.")}
          </p>
        </div>
        {/* Das echte Beispielbuch: ein Tipp schlägt es auf, wie unter /beispiel. --reserve lässt Platz für Überschrift, Zettel und Knopf */}
        <ul className="flex justify-center pt-14 md:col-span-7 md:pt-20 flat:col-span-7 flat:pt-0">
          <ClosedBook
            book={book}
            index={0}
            feature
            note={t("Ein Beispiel von Michel")}
            meta={t("{n} Tafeln · ohne Konto", { n: book.plates.length })}
            className="[--reserve:27rem]! md:[--reserve:15rem]! flat:[--reserve:7.5rem]!"
          />
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 2. Mach dein eigenes */

function Own() {
  const t = useT();
  return (
    <section id="eigenes" aria-labelledby="eigenes-h" className="linen table-surface relative overflow-hidden bg-table-deep px-page py-20 md:py-32">
      <div className="grid gap-8 md:grid-cols-12 md:gap-8">
        <h2 id="eigenes-h" className={`${displayHeading} md:col-span-5`} style={display}>
          {t("Mach dein eigenes.")}
        </h2>
        <div className="md:col-span-6 md:col-start-7">
          <p className="text-on-table max-w-[30rem] text-lg leading-relaxed opacity-80 lg:max-w-[34rem] lg:text-xl">
            {t("Ein Ordner Fotos wird ein Buch, das man wirklich umblättert. Mit dem Fuji-Rezept als Zettel dazu.")}
          </p>
          <div className="mt-8">
            <EnterButton />
          </div>
          <p className="text-on-table-2 mt-5 flex items-start gap-2 text-sm">
            <span aria-hidden className="bg-cloth mt-[0.5lh] size-1.5 shrink-0 -translate-y-1/2 rounded-full" />
            {t("Kostenlos. Wer einen Link bekommt, liest ohne Konto.")}
          </p>
          <p className="text-on-table-2 mt-2 max-w-[30rem] text-xs leading-relaxed">
            {t("Ein Buch zum Blättern im Browser, kein Druck. Anmeldung mit {providers}, es gelten die", { providers: t(PROVIDERS) })}{" "}
            <Link href="/nutzungsbedingungen" className={linkClass}>
              {t("Nutzungsbedingungen")}
            </Link>{" "}
            {t("und der")}{" "}
            <Link href="/datenschutz" className={linkClass}>
              {t("Datenschutz")}
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 3. Was Calima kann */

/* ------------------------------------------------------------------ Werkbank: Abzüge werden eine Doppelseite */

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

// Biegung je Schlüsselbild (globals.css, bend-r / bend-l) als Anteil von `bend` je Streifen
const BEND_KEYS = { r: [1, 0.45, 0.75, 0.12], l: [0.7, 1, 0.35, 0.5] } as const;

/**
 * Wie weit Streifen j vorrücken muss, damit seine Kante exakt auf der des inneren Nachbarn liegt, in Streifenbreiten.
 * Exakt statt Kleinwinkel-Näherung: bei 40° fehlte sonst gut ein Pixel, und durch die Fuge schien das Papier.
 */
function hingeOffsets(j: number, deg: number) {
  let x = 0;
  let z = 0;
  for (let i = 1; i < j; i++) {
    const a = (i * deg * Math.PI) / 180;
    x += 1 - Math.cos(a);
    z += Math.sin(a);
  }
  return { x: +x.toFixed(5), z: +z.toFixed(5) };
}

const lightColor = (side: "l" | "r", a: number) =>
  side === "r" ? `color-mix(in srgb, var(--color-paper) ${+(a * 100).toFixed(1)}%, transparent)` : `rgb(12 10 8 / ${+a.toFixed(3)})`;

/**
 * Ein Streifen des Abzugs. Alle Streifen liegen nebeneinander im Abzug (keine Verschachtelung, die Safari nicht zeichnet);
 * jeder dreht sich um seine Kante zur Mitte und rückt so weit vor, dass er an den inneren Nachbarn anschließt (globals.css).
 */
function Strip({ src, sizes, side, j, bend }: { src: StaticImageData; sizes: string; side: "l" | "r"; j: number; bend: number }) {
  const outer = j === STRIPS;
  const offsets: Record<string, number> = {};
  BEND_KEYS[side].forEach((f, k) => {
    const { x, z } = hingeOffsets(j, f * bend);
    offsets[`--x${k}`] = x;
    offsets[`--z${k}`] = z;
  });
  // Bild und Licht reichen 2px unter den inneren Nachbarn: die Kanten gedrehter Ebenen werden geglättet, ohne Überlappung blitzt dort das Papier
  const inner = side === "r" ? "left" : "right";
  const outerSide = side === "r" ? "right" : "left";
  const reach = { [inner]: -2, [outerSide]: -1 };
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
        ...offsets,
      }}
    >
      {/* Papierrand, solange der Abzug lose ist: nur oben, unten und außen, damit zwischen den Streifen kein Weiß durchblitzt */}
      <div aria-hidden className="bench-border absolute -inset-y-[5px]" style={{ left: side === "l" && outer ? -5 : -1, right: side === "r" && outer ? -5 : -1 }}>
        <div className="bg-paper absolute inset-x-0 top-0 h-[6px]" />
        <div className="bg-paper absolute inset-x-0 bottom-0 h-[6px]" />
        {outer && <div className={`bg-paper absolute inset-y-0 w-[6px] ${side === "l" ? "left-0" : "right-0"}`} />}
      </div>
      <div className="absolute inset-y-0 overflow-hidden" style={reach}>
        {/* Maß ist die Streifenbreite --w, nicht die Klappe: sonst verrutscht das Bild von Streifen zu Streifen um die Überlappung */}
        <div className="absolute inset-y-0" style={{ width: `calc(${2 * STRIPS} * var(--w))`, left: `calc(${-at} * var(--w) + ${-reach.left}px)` }}>
          {/* sofort laden: Safari lädt Bilder in gedrehten, verschobenen Ebenen sonst nicht zuverlässig nach */}
          <Image src={src} alt="" fill sizes={sizes} loading="eager" className="object-cover" />
        </div>
      </div>
      {/* Licht von links oben: rechts aufgebogene Streifen glänzen, links aufgebogene liegen im Schatten.
          Als Verlauf vom Wert des inneren Nachbarn (j − 1) zum eigenen (j), sonst springt die Helligkeit an jeder Kante und die Streifen sehen aus wie Fugen */}
      <div
        aria-hidden
        className={`bench-light-${side} absolute inset-y-0 opacity-0`}
        style={{ ...reach, backgroundImage: `linear-gradient(to ${outerSide}, ${lightColor(side, (j - 1) / j)}, ${lightColor(side, 1)})` }}
      />
    </div>
  );
}

/** Der Abzug als biegsames Blatt: je Hälfte STRIPS Streifen, von der Mitte nach außen gezählt */
function Sheet({ src, sizes, bend }: { src: StaticImageData; sizes: string; bend: number }) {
  const js = Array.from({ length: STRIPS }, (_, i) => i + 1);
  return (
    <>
      {js.map((j) => (
        <Strip key={`l${j}`} src={src} sizes={sizes} side="l" j={j} bend={bend} />
      ))}
      {js.map((j) => (
        <Strip key={`r${j}`} src={src} sizes={sizes} side="r" j={j} bend={bend} />
      ))}
    </>
  );
}

/** eyebrow: die kleine Überschrift des Abschnitts, in dem die Werkbank als erste Funktion steht */
function Workbench({ eyebrow }: { eyebrow?: ReactNode }) {
  const t = useT();
  return (
    <div id="werkbank" role="group" aria-labelledby="bench-h" className="bench-track relative scroll-mt-0">
      <div className="linen table-surface sticky top-0 flex min-h-svh flex-col justify-center overflow-hidden bg-table-deep px-page py-12 md:py-10">
        <div className="relative z-10 grid items-center gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            {eyebrow}
            <h3 id="bench-h" className={displayHeading} style={display}>
              {t("Reinziehen.")}
              <br />
              {t("Fertig gesetzt.")}
            </h3>
            <p className="text-on-table mt-6 max-w-[28rem] text-base leading-relaxed opacity-80 md:text-lg xl:text-xl">
              {t(
                "Fotos vom Handy, von der Fuji oder aus Lightroom auf die Werkbank ziehen, auch HEIC und DNG. Nach ein, zwei Sekunden stehen sie als Doppelseiten da, nach Aufnahmezeit geordnet. Ortsdaten fallen beim Hochladen weg.",
              )}
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
                    {/* jede Unterschrift steht bündig unter ihrem Bild; das randlose Bild links bekommt seine unten am Bund */}
                    <Cap items={[[2, t("Erst mittags offen")]]} x={12} y={61.5} />
                    <Cap items={[[3, t("Eingerollt")]]} x={12} y={127.5} />
                    <Cap items={[[4, t("Platt")]]} x={52} y={127.5} />
                    <Cap items={[[1, t("Drachenbaum, links")]]} x={12} y={137} />
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
                <Sheet src={s.src} sizes={s.sizes} bend={s.bend} />
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
            <span className="bench-count-a">{t("4 Fotos, nach Aufnahmezeit")}</span>
            <span className="bench-count-b">{t("Eine Doppelseite, ohne einen Handgriff")}</span>
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}

function Recipe() {
  const t = useT();
  return (
    <div role="group" aria-labelledby="recipe-h" className="linen table-surface relative overflow-hidden bg-table px-page py-24 md:py-28">
      <div className="grid gap-6 md:grid-cols-12 md:gap-8">
        <h3 id="recipe-h" className={`${displayHeading} md:col-span-7`} style={display}>
          {t("Das Rezept liegt bei.")}
        </h3>
        <p className="text-on-table text-lg leading-relaxed opacity-80 md:col-span-5 md:col-start-8 md:self-end lg:text-xl">
          {t("Filmsimulation, Körnung, Weißabgleich: Was die Fuji in die Datei schreibt, liegt als Zettel unter dem Foto. Lightroom-Presets nimmt man gleich als .xmp mit.")}
          <span className="mt-4 block">{t("Im Fotostudio liest Calima Rezept und Preset aus der Datei und legt den Look mit einem Tipp über alle Fotos.")}</span>
        </p>
      </div>

      <figure className="relative mx-auto mt-14 max-w-[880px] md:mt-16 xl:max-w-[1040px]">
        <Clip clip={CLIPS.rezept} label={t("Clip: Calima liest Fuji-Rezept und Lightroom-Preset, ein Look für alle Fotos")} className="mx-auto w-[74%] -rotate-[1.5deg] md:mx-0 md:ml-[8%] md:w-[38%]" />
        {/* Zettel schiebt sich unter dem Clip hervor, sobald er ins Bild kommt */}
        <Slip className="reveal-slip relative mt-[-18%] ml-auto w-[88%] rotate-[3deg] p-5 md:absolute md:right-0 md:bottom-[14%] md:mt-0 md:w-[50%] md:p-8">
          <span className="text-ink-2 block text-xs md:text-sm">{t("Rezept · Beispielwerte")}</span>
          <span className="mt-1 block text-2xl font-bold tracking-[-0.02em] md:text-4xl" style={narrow}>
            Classic Chrome
          </span>
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-sm md:text-base">
            <dt className="text-ink-2">{t("Dynamik|Fuji")}</dt>
            <dd>DR200</dd>
            <dt className="text-ink-2">{t("Lichter · Schatten")}</dt>
            <dd>−1 · +1</dd>
            <dt className="text-ink-2">{t("Farbe")}</dt>
            <dd>+2</dd>
            <dt className="text-ink-2">{t("Körnung")}</dt>
            <dd className="flex items-center gap-2">
              <span aria-hidden className="flex gap-[3px]">
                <span className="block h-2 w-5 bg-ink" />
                <span className="block h-2 w-5 bg-ink/15" />
              </span>
              {t("schwach, klein")}
            </dd>
            <dt className="text-ink-2">{t("Weißabgleich")}</dt>
            <dd>Auto · R+1 B−2</dd>
          </dl>
        </Slip>
      </figure>
    </div>
  );
}

function Share() {
  const t = useT();
  return (
    <div role="group" aria-labelledby="share-h" className="linen table-surface relative overflow-hidden bg-table-deep px-page py-24 md:py-28">
      <div className="grid items-center gap-16 md:grid-cols-12 md:gap-8">
        <div className="relative mx-auto w-full max-w-[520px] md:col-span-6 md:mx-0 xl:max-w-[640px]">
          <Clip clip={CLIPS.hinlegen} label={t("Clip: Fotos werden ein Buch, das Buch wird einer Person hingelegt")} className="w-[66%] -rotate-[2deg] md:w-[58%]" />
          <Slip className="reveal-slip top-[6%] right-0 w-[46%] rotate-[3deg] text-[15px]">
            {t("Für Jana, von Michel")}
            <span className="text-ink-2 mt-1.5 block font-mono text-[11px] break-all">calima.web.app/b?t=…</span>
          </Slip>
          <Slip className="reveal-slip reveal-late top-[42%] right-[2%] w-[50%] -rotate-[2deg] text-[15px] leading-snug">
            <span className="text-ink-2 block text-xs">{t("Zettel zu Tafel 7, von Jana")}</span>
            {t("Das Tor im Regen hätte ich gern an der Wand.")}
          </Slip>
        </div>
        <div className="md:col-span-5 md:col-start-8">
          <h3 id="share-h" className={displayHeading} style={display}>
            {t("Hinlegen, nicht posten.")}
          </h3>
          <p className="text-on-table mt-6 max-w-[30rem] text-lg leading-relaxed opacity-80 lg:max-w-[34rem] lg:text-xl">
            {t("Für jede Person ein eigener Link. Sie blättert ohne Konto, auf dem Telefon Seite für Seite, und lässt dir Zettel und Eselsohren da, die nur du liest.")}
          </p>
          <p className="text-on-table-2 mt-6 max-w-[30rem] text-base leading-relaxed lg:max-w-[34rem] lg:text-lg">
            {t("Kein Profil, kein Feed. Ein Buch sieht nur, wer den Link hat, und jeden Link kannst du einzeln zurückziehen.")}
          </p>
        </div>
      </div>
    </div>
  );
}

const APP_ICONS = { look: Aperture, film: Film, white: Pipette } as const;

/** Ehrlich sagen, was im Web fehlt: die Kamera kommt mit der iPhone-App */
function AppCamera() {
  const t = useT();
  return (
    <div role="group" aria-labelledby="app-h" className="linen table-surface relative overflow-hidden bg-table px-page py-24 md:py-28">
      <div className="grid gap-6 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-7">
          <p className="text-on-table-2 flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden className="bg-cloth size-1.5 rounded-full" />
            {t("Bald im App Store")}
          </p>
          <h3 id="app-h" className={`${displayHeading} mt-4 [text-wrap:balance]`} style={display}>
            {/* geschütztes Trennzeichen: „iPhone-App“ bricht nicht am Bindestrich */}
            {t("Die Kamera gibt es nur in der iPhone-App.").replace("iPhone-App", "iPhone\u2011App")}
          </h3>
        </div>
        <p className="text-on-table text-lg leading-relaxed opacity-80 md:col-span-5 md:col-start-8 md:self-end lg:text-xl">
          {t("Fotografieren wie mit der Fuji, und die Bilder landen gleich im Buch.")}{" "}
          {TESTFLIGHT_URL ? (
            <a href={TESTFLIGHT_URL} className={`${linkClass} font-semibold opacity-100`}>
              {t("Vorab testen mit TestFlight")}
            </a>
          ) : (
            t("Sie kommt bald in den App Store.")
          )}
        </p>
      </div>
      <ul className="mt-14 grid gap-10 md:mt-20 md:grid-cols-3 md:gap-8">
        {APP_FEATURES.map((f) => {
          const Icon = APP_ICONS[f.icon];
          return (
            <li key={f.title} className="border-on-table-2/25 border-t pt-5">
              <Icon aria-hidden className="text-on-table-2 size-5" strokeWidth={1.75} />
              <h4 className="text-on-table mt-4 text-2xl font-bold tracking-[-0.02em]" style={narrow}>
                {t(f.title)}
              </h4>
              <p className="text-on-table-2 mt-2 max-w-[30rem] text-base leading-relaxed lg:text-lg">{t(f.text)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ 4. So geht’s */

function HowTo() {
  const t = useT();
  return (
    <section id="so-gehts" aria-labelledby="so-gehts-h" className="linen table-surface relative overflow-hidden bg-table px-page py-20 md:py-32">
      <h2 id="so-gehts-h" className={displayHeading} style={display}>
        {t("So geht’s")}
      </h2>
      <ol className="mt-12 grid gap-10 md:mt-16 md:grid-cols-3 md:gap-8">
        {HOWTO.map((s, i) => (
          <li key={s.title} className="border-on-table-2/25 border-t pt-5">
            <span className="text-on-table-2 block text-sm font-semibold tabular-nums">{i + 1}</span>
            <h3 className="text-on-table mt-2 text-2xl font-bold tracking-[-0.02em]" style={narrow}>
              {t(s.title)}
            </h3>
            <p className="text-on-table-2 mt-2 max-w-[30rem] text-base leading-relaxed lg:text-lg">{t(s.text)}</p>
            <Link href={s.href} className={`${linkClass} text-on-table mt-3 inline-flex items-center gap-1 text-sm font-semibold`}>
              {t("Mehr in der Hilfe")}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ Schluss */

function Closing() {
  const t = useT();
  return (
    <>
      <section aria-labelledby="end-h" className="linen table-surface relative overflow-hidden bg-table px-page pt-24 pb-20 md:pt-40 md:pb-28">
        <SunAndShade light="sun" />
        <div className="relative z-20">
          <h2 id="end-h" className="text-on-table max-w-[12ch] leading-[0.86] font-bold tracking-[-0.04em]" style={{ ...display, fontSize: "clamp(56px, 9vw, 144px)" }}>
            {t("Leg deinen Sommer auf den Tisch.")}
          </h2>
          <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-4">
            <EnterButton label={t("Erstes Buch anlegen")} />
            <p className="text-on-table-2 text-sm">
              {t("Kostenlos, Anmeldung mit {providers}. Bücher sieht nur, wem du einen Link gibst.", { providers: t(PROVIDERS) })}{" "}
              <Link href="/nutzungsbedingungen" className={linkClass}>
                {t("Nutzungsbedingungen")}
              </Link>
              {" · "}
              <Link href="/datenschutz" className={linkClass}>
                {t("Datenschutz")}
              </Link>
            </p>
          </div>
        </div>
      </section>
      <footer className="linen table-surface relative bg-table px-page pb-10 text-sm text-on-table-2">
        <div className="border-on-table-2/25 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t pt-6">
          <p>
            <span className="text-on-table font-semibold">Calima</span> · {t("Beispielfotos von Michel Leotta")}
          </p>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <nav aria-label={t("Räume")} className="flex gap-x-5">
              <Link href="/zimmer" className={`${hitClass} decoration-mark decoration-2 underline-offset-4 hover:text-on-table hover:underline`}>
                {t("Bücherzimmer")}
              </Link>
            </nav>
            <LegalLinks />
          </div>
        </div>
      </footer>
    </>
  );
}

/** 3. Was Calima kann: Werkbank, Rezept, Hinlegen, Kamera aus der App; die Überschrift steht klein über der Werkbank */
function Features() {
  const t = useT();
  return (
    <section id="kann" aria-labelledby="kann-h">
      <Workbench
        eyebrow={
          <h2 id="kann-h" className="text-on-table-2 mb-5 text-sm font-semibold tracking-[0.08em] uppercase">
            {t("Was Calima kann")}
          </h2>
        }
      />
      <Recipe />
      <Share />
      <AppCamera />
      {/* alle Funktionen mit Bildern aus der App auf einer eigenen Seite (#267) */}
      <div className="linen table-surface bg-table px-page pb-20 md:pb-28">
        <Link href={FEATURES_PATH} className={`${buttonClass("quiet", "md", "px-6")} text-on-table`}>
          {t("Alles, was Calima kann")}
          <ArrowRight aria-hidden />
        </Link>
      </div>
    </section>
  );
}

// Jeder Abschnitt aus SECTIONS (lib/landing.ts) mit seinem Bauteil; die Reihenfolge kommt von dort
const PARTS: Record<SectionId, () => ReactNode> = { blaettern: Hero, eigenes: Own, kann: Features, "so-gehts": HowTo };

export function Landing() {
  const t = useT();
  const [first, ...rest] = SECTIONS;
  const Top = PARTS[first.id];
  return (
    // Safari zählt in 3D gedrehte Abzüge sonst zur Seitenhöhe mit, auch wenn ihr Abschnitt sie abschneidet;
    // clip schneidet ab, ohne einen Scrollbereich zu bilden, das Kleben der Werkbank bleibt erhalten
    <main className="overflow-clip">
      {/* Aufgeschlagen nimmt das Buch die ganze Seite ein (#fuerteventura); zugeklappt liegt die Landing wieder da */}
      <Library
        books={[book]}
        bookEnd={<OwnBook />}
        backLabel={t("Zurück|Buch")}
        footer={
          <>
            {rest.map(({ id }) => {
              const Part = PARTS[id];
              return <Part key={id} />;
            })}
            <Closing />
          </>
        }
      >
        <Top />
      </Library>
    </main>
  );
}
