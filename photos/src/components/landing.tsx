"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";

import { FrameButton, linkClass, TextButton } from "@/components/app-ui";
import { SunAndShade } from "@/components/sun-and-shade";
import { signIn } from "@/lib/firebase";
import { useUser } from "@/lib/use-user";

import palme from "../../public/photos/02-palme.jpg";
import bougainvillea from "../../public/photos/04-bougainvillea.jpg";
import rettungsturm from "../../public/photos/09-rettungsturm.jpg";
import stuehle from "../../public/photos/stuehle-gelb.jpg";
import felsbogen from "../../public/photos/11-felsbogen.jpg";
import strand from "../../public/photos/03-strand.jpg";
import drachenbaum from "../../public/photos/08-drachenbaum.jpg";
import mittagsblume from "../../public/photos/06-mittagsblume.jpg";
import markisen from "../../public/photos/markisen.jpg";
import reifen from "../../public/photos/reifen.jpg";
import schild from "../../public/photos/01-schild-am-meer.jpg";
import torii from "../../public/photos/japan/torii.jpg";

// Landing Page. Das Produkt führt sich selbst vor, ohne Bildschirmfotos:
// 1. Kopf: ein aufgeschlagenes Buch auf dem Basalttisch, Scrollen blättert drei Blätter in echtem 3D um.
// 2. Werkbank: vier lose Abzüge fliegen beim Scrollen an ihren Platz auf einer Doppelseite.
// 3. Rezept: ein großes Foto, der Zettel schiebt sich darunter hervor.
// 4. Hinlegen: der Band mit Zettel für eine Person, ein Zettel kommt zurück.
// Alle Bewegung hängt am Scrollen (CSS scroll-driven animations, kein JavaScript dafür) und nutzt nur
// transform und opacity. Ohne Unterstützung oder bei reduzierter Bewegung steht jede Szene fertig da.

const display: CSSProperties = { fontVariationSettings: '"wdth" 75, "opsz" 96' };
const narrow: CSSProperties = { fontVariationSettings: '"wdth" 80' };
const lifted = "shadow-[0_28px_50px_-18px_rgb(12_10_8/0.75),0_6px_14px_-6px_rgb(12_10_8/0.5)]";

/** Anmelden und gleich ins Bücherzimmer; wer schon angemeldet ist, geht direkt hinein */
function useEnter() {
  const user = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const enter = () => {
    setBusy(true);
    signIn()
      .then(() => router.push("/zimmer"))
      .catch(() => setBusy(false));
  };
  return { user, busy, enter };
}

function HeaderSession() {
  const { user, busy, enter } = useEnter();
  // solange Firebase prüft, bleibt die Stelle leer statt zu springen
  if (user === undefined) return <span className="text-sm">&nbsp;</span>;
  if (user)
    return (
      <Link href="/zimmer" className={`${linkClass} text-sm`}>
        Ins Bücherzimmer
      </Link>
    );
  return (
    <TextButton className="text-sm" disabled={busy} onClick={enter}>
      Anmelden
    </TextButton>
  );
}

const enterClass = "press px-6 py-3 text-base";

function EnterButton({ label = "Mit Google anmelden" }: { label?: string }) {
  const { user, busy, enter } = useEnter();
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
    <FrameButton className={enterClass} disabled={busy || user === undefined} onClick={enter}>
      {busy ? "Einen Moment …" : label}
    </FrameButton>
  );
}

/* ------------------------------------------------------------------ Papier und Leinen */

/** Foto im Seitenrahmen, Maße in cqw der Seite (Breite 100, Höhe 150) */
function Pic({ src, x, y, w, h, pos, sizes = "30vw", eager = false }: { src: StaticImageData; x: number; y: number; w: number; h: number; pos?: string; sizes?: string; eager?: boolean }) {
  return (
    <div className="absolute overflow-hidden" style={{ left: `${x}cqw`, top: `${y}cqw`, width: `${w}cqw`, height: `${h}cqw` }}>
      <Image src={src} alt="" fill sizes={sizes} loading={eager ? "eager" : "lazy"} className="object-cover" style={{ objectPosition: pos }} />
    </div>
  );
}

/** Bildunterschrift wie im Buch: Nummer halbfett in Tinte, Titel in grauer Tinte */
function Cap({ no, title, x, y, right = false }: { no: number; title: string; x: number; y: number; right?: boolean }) {
  return (
    <p
      className={`text-ink-2 absolute whitespace-nowrap ${right ? "text-right" : ""}`}
      style={{ top: `${y}cqw`, [right ? "right" : "left"]: `${right ? 100 - x : x}cqw`, fontSize: "max(9px, 3.1cqw)", lineHeight: 1.375 }}
    >
      <span className="text-ink font-semibold">{no}</span>
      <span className="ml-[0.6em]">{title}</span>
    </p>
  );
}

/** Eine Buchseite: Naturpapier, zum Bund hin dunkler (die Seite wölbt sich dort) */
function PageFace({ side, children, className = "" }: { side: "left" | "right"; children?: ReactNode; className?: string }) {
  return (
    <div className={`paper absolute inset-0 overflow-hidden [container-type:inline-size] ${className}`}>
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-[14cqw]"
        style={{
          [side === "left" ? "right" : "left"]: 0,
          background: `linear-gradient(to ${side === "left" ? "left" : "right"}, rgb(12 10 8 / 0.16), rgb(12 10 8 / 0.05) 30%, transparent)`,
        }}
      />
    </div>
  );
}

/** Geschlossener Band in Ringelblumen-Leinen, Maße wie der echte Einband (layout.ts, „cover“) */
function Cover({ photo, title, author, className = "" }: { photo: StaticImageData; title: string; author: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div aria-hidden className={`absolute inset-0 ${lifted}`} />
      <div aria-hidden className="absolute top-[1.2%] bottom-[0.4%] left-full w-[10px] bg-[repeating-linear-gradient(to_right,var(--paper)_0_1px,var(--paper-shade)_1px_2px)]" />
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

// Doppelseiten des Vorführbuchs. Blatt i trägt vorne die rechte Seite von Doppelseite i
// und hinten die linke Seite von Doppelseite i + 1 (wie in book.tsx).
const L0 = (
  <PageFace side="left">
    <p className="text-ink absolute top-[14cqw] left-[12cqw] text-[12cqw] leading-[0.9] font-bold tracking-[-0.035em]" style={display}>
      Sommer
    </p>
    <p className="text-ink absolute top-[29cqw] left-[12cqw] text-[3.4cqw]">Fuerteventura</p>
    <p className="text-ink-2 absolute bottom-[14cqw] left-[12cqw] text-[3.4cqw]">Dein Name</p>
  </PageFace>
);
const LEAVES: { front: ReactNode; back: ReactNode }[] = [
  {
    front: (
      <PageFace side="right">
        <Pic src={palme} x={0} y={0} w={100} h={150} sizes="(min-width: 768px) 30vw, 50vw" eager />
      </PageFace>
    ),
    back: (
      <PageFace side="left">
        <Pic src={bougainvillea} x={0} y={0} w={100} h={150} sizes="(min-width: 768px) 30vw, 50vw" />
      </PageFace>
    ),
  },
  {
    front: (
      <PageFace side="right">
        <Pic src={rettungsturm} x={30} y={12} w={58} h={87} sizes="(min-width: 768px) 18vw, 30vw" />
        <Cap no={2} title="Rettungsturm" x={88} y={102} right />
      </PageFace>
    ),
    back: (
      <PageFace side="left">
        <Pic src={stuehle} x={12} y={68} w={40} h={60} sizes="(min-width: 768px) 12vw, 20vw" />
        <Cap no={3} title="Stühle vor gelber Wand" x={12} y={131} />
      </PageFace>
    ),
  },
  {
    front: (
      <PageFace side="right">
        <Pic src={strand} x={6} y={12} w={82} h={54.7} sizes="(min-width: 768px) 25vw, 40vw" />
        <Cap no={4} title="Am Wasser" x={88} y={70} right />
      </PageFace>
    ),
    // über den Bund: ein Bild, auf zwei Seiten verteilt (jede Seite zeigt ihre Hälfte)
    back: (
      <PageFace side="left">
        <Pic src={felsbogen} x={0} y={0} w={200} h={150} pos="35% 50%" sizes="(min-width: 768px) 60vw, 100vw" />
      </PageFace>
    ),
  },
];
const R_LAST = (
  <PageFace side="right">
    <Pic src={felsbogen} x={-100} y={0} w={200} h={150} pos="35% 50%" sizes="(min-width: 768px) 60vw, 100vw" />
  </PageFace>
);
const SPREADS = LEAVES.length + 1;

function TurningBook() {
  return (
    <div className="hero-book relative w-full [perspective:2400px]" style={{ ["--n" as string]: LEAVES.length }}>
      <div className="hero-tilt relative aspect-[4/3] w-full [transform-style:preserve-3d]">
        {/* Buchblock und Schatten auf dem Tisch */}
        <div aria-hidden className={`absolute inset-0 ${lifted}`} />
        <div aria-hidden className="absolute inset-y-[0.6%] -left-[7px] w-[7px] bg-[repeating-linear-gradient(to_right,var(--paper)_0_1px,var(--paper-shade)_1px_2px)]" />
        <div aria-hidden className="absolute inset-y-[0.6%] -right-[7px] w-[7px] bg-[repeating-linear-gradient(to_right,var(--paper)_0_1px,var(--paper-shade)_1px_2px)]" />
        <div className="absolute inset-y-0 left-0 w-1/2">{L0}</div>
        <div className="absolute inset-y-0 right-0 w-1/2">{R_LAST}</div>
        {LEAVES.map((leaf, i) => (
          <div
            key={i}
            className="leaf absolute inset-y-0 right-0 w-1/2 origin-left [transform-style:preserve-3d]"
            style={{ ["--i" as string]: i, zIndex: LEAVES.length - i }}
          >
            <div className="absolute inset-0 [backface-visibility:hidden]">
              {leaf.front}
              <div aria-hidden className="leaf-shade-front pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(12_10_8/0.55),rgb(12_10_8/0.15))] opacity-0" />
            </div>
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              {leaf.back}
              <div aria-hidden className="leaf-shade-back pointer-events-none absolute inset-0 bg-[linear-gradient(to_left,rgb(12_10_8/0.55),rgb(12_10_8/0.15))] opacity-0" />
            </div>
          </div>
        ))}
      </div>
      {/* Bildfolge-Linie: ein Haltepunkt je Doppelseite, der aktive in Einbandgelb */}
      <div aria-hidden className="mx-auto mt-10 flex w-40 items-end justify-between md:mt-14">
        {Array.from({ length: SPREADS }, (_, i) => (
          <span key={i} className="relative block h-[10px] w-[3px] bg-on-table-2/60">
            <span className="hero-stop bg-mark absolute inset-x-0 bottom-0 h-[19px] origin-bottom opacity-0" style={{ ["--i" as string]: i }} />
          </span>
        ))}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-h" className="hero-track relative">
      <div className="linen table-surface sticky top-0 flex min-h-svh flex-col overflow-hidden bg-table">
        <SunAndShade light="sun" />
        <header className="relative z-20 flex items-baseline justify-between gap-6 px-4 pt-4 md:px-8 md:pt-6">
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
          <div className="md:col-span-4 md:self-end md:pb-[14svh]">
            <h1 id="hero-h" className="text-on-table leading-[0.86] font-bold tracking-[-0.04em] [text-wrap:balance]" style={{ ...display, fontSize: "clamp(52px, 7.4vw, 112px)" }}>
              Deine Fotos, gebunden.
            </h1>
            <p className="text-on-table mt-6 max-w-[26rem] text-lg leading-relaxed opacity-80 md:text-xl">
              Ein Ordner Fotos wird ein Buch, das man wirklich umblättert. Mit dem Fuji-Rezept als Zettel dazu.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
              <EnterButton />
            </div>
            <p className="text-on-table-2 mt-5 text-sm">Lesen geht ohne Konto.</p>
          </div>
          <div className="md:col-span-8 md:col-start-5 md:pl-[4vw]">
            <TurningBook />
            <p className="hero-hint text-on-table-2 mt-4 text-center text-sm">Scrollen zum Blättern</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 2. Werkbank: Abzüge werden eine Doppelseite */

// Platz auf der Doppelseite in % (Breite 2 Seiten, Höhe 1.5 Seiten) und Startlage als loser Abzug auf dem Tisch
const SLOTS = [
  { src: drachenbaum, box: [0, 0, 50, 100], from: ["6vw", "-58svh", "-9deg"], sizes: "(min-width: 768px) 30vw, 50vw" },
  { src: mittagsblume, box: [56, 6, 38, 33.8], from: ["-14vw", "-46svh", "8deg"], sizes: "(min-width: 768px) 22vw, 40vw" },
  { src: markisen, box: [56, 48, 18, 36], from: ["-30vw", "40svh", "-7deg"], sizes: "(min-width: 768px) 12vw, 22vw" },
  { src: reifen, box: [76, 48, 18, 36], from: ["4vw", "52svh", "11deg"], sizes: "(min-width: 768px) 12vw, 22vw" },
] as const;

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
          <div className="relative aspect-[4/3] w-full">
            {/* die Doppelseite liegt schon da und wartet auf ihre Bilder */}
            <div className={`bench-paper absolute inset-0 grid grid-cols-2 ${lifted}`}>
              <div className="relative">
                <PageFace side="left" />
              </div>
              <div className="relative">
                <PageFace side="right">
                  <Cap no={2} title="Mittagsblume" x={88} y={81} right />
                  <Cap no={3} title="Markisen · 4 Platter Reifen" x={88} y={131} right />
                </PageFace>
              </div>
            </div>
            {SLOTS.map((s, i) => (
              <div
                key={i}
                className="bench-print absolute"
                style={{
                  left: `${s.box[0]}%`,
                  top: `${s.box[1]}%`,
                  width: `${s.box[2]}%`,
                  height: `${s.box[3]}%`,
                  ["--fx" as string]: s.from[0],
                  ["--fy" as string]: s.from[1],
                  ["--fr" as string]: s.from[2],
                  ["--i" as string]: i,
                }}
              >
                <div aria-hidden className="bench-border bg-paper absolute -inset-[5px] shadow-[0_18px_30px_-12px_rgb(12_10_8/0.6)]" />
                <div className="absolute inset-0">
                  <Image src={s.src} alt="" fill sizes={s.sizes} className="object-cover" />
                </div>
              </div>
            ))}
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
            <p className="text-on-table-2 text-sm">Anmeldung mit Google. Bücher sieht nur, wem du einen Link gibst.</p>
          </div>
        </div>
      </section>
      <footer className="linen table-surface relative bg-table px-4 pb-10 text-sm text-on-table-2 md:px-8">
        <div className="border-on-table-2/25 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t pt-6">
          <p>
            <span className="text-on-table font-semibold">Fujiventura</span> · Beispielfotos von Michel Leotta
          </p>
          <nav aria-label="Räume" className="flex gap-x-5">
            <Link href="/zimmer" className="decoration-mark decoration-2 underline-offset-4 hover:text-on-table hover:underline">
              Bücherzimmer
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}

export function Landing() {
  return (
    <main>
      <Hero />
      <Workbench />
      <Recipe />
      <Share />
      <Closing />
    </main>
  );
}
