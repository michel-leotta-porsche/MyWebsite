"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { FrameButton, linkClass, TextButton } from "@/components/app-ui";
import { SunAndShade } from "@/components/sun-and-shade";
import { signIn } from "@/lib/firebase";
import { useUser } from "@/lib/use-user";

import palme from "../../public/photos/02-palme.jpg";
import felsbogen from "../../public/photos/11-felsbogen.jpg";
import stuehle from "../../public/photos/stuehle-gelb.jpg";
import bougainvillea from "../../public/photos/04-bougainvillea.jpg";
import rettungsturm from "../../public/photos/09-rettungsturm.jpg";
import strand from "../../public/photos/03-strand.jpg";
import torii from "../../public/photos/japan/torii.jpg";
import reifenThumb from "@/content/thumbs/reifen.jpg";
import markisenThumb from "@/content/thumbs/markisen.jpg";
import kaktusThumb from "@/content/thumbs/05-kaktus-dach.jpg";
import hirscheThumb from "@/content/thumbs/japan/hirsche.jpg";
import raupeThumb from "@/content/thumbs/raupe.jpg";
import schildThumb from "@/content/thumbs/01-schild-am-meer.jpg";

// Landing Page: das Produkt in vier Bildern. Kopf mit Einband, drei Schritte (Werkbank, Doppelseite,
// Hinlegen), was es kann, Schluss mit Anmeldung. Alles Gezeigte ist HTML auf denselben Materialien wie
// die App (Tisch, Leinen, Papier, Zettel), keine Bildschirmfotos. Bewegung nur über transform/opacity,
// der Ausgangszustand ist immer der fertige Zustand.

const display: CSSProperties = { fontVariationSettings: '"wdth" 75, "opsz" 96' };
const narrow: CSSProperties = { fontVariationSettings: '"wdth" 80' };
// Schatten aus Basalt, nur wo Papier oder Leinen auf dem Tisch liegt
const onTable = "shadow-[0_22px_40px_-16px_rgb(12_10_8/0.8),0_4px_10px_-4px_rgb(12_10_8/0.55)]";
const print = "shadow-[0_18px_30px_-12px_rgb(12_10_8/0.6),0_2px_4px_rgb(12_10_8/0.25)]";

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

function EnterButton({ label = "Mit Google anmelden" }: { label?: string }) {
  const { user, busy, enter } = useEnter();
  if (user)
    return (
      <Link
        href="/zimmer"
        className="border-on-table text-on-table hover:bg-on-table hover:text-table inline-block border px-4 py-2 text-sm font-semibold transition-colors duration-150"
      >
        Ins Bücherzimmer
      </Link>
    );
  return (
    <FrameButton disabled={busy || user === undefined} onClick={enter}>
      {busy ? "Einen Moment …" : label}
    </FrameButton>
  );
}

/* ------------------------------------------------------------------ Materialien */

/** Geschlossener Band in Ringelblumen-Leinen, Maße wie der echte Einband (layout.ts, „cover“) */
function Cover({ photo, title, author, className = "", style, priority = false }: { photo: StaticImageData; title: string; author: string; className?: string; style?: CSSProperties; priority?: boolean }) {
  return (
    <div className={`relative ${className}`} style={style}>
      <div aria-hidden className={`absolute inset-0 ${onTable}`} />
      {/* Buchblock: Papierkanten rechts */}
      <div aria-hidden className="absolute top-[1.2%] bottom-[0.4%] left-full w-[9px] bg-[repeating-linear-gradient(to_right,var(--paper)_0_1px,var(--paper-shade)_1px_2px)]" />
      <div className="linen bg-cloth relative aspect-[2/3] w-full overflow-hidden [container-type:inline-size]">
        {/* Falz am Rücken */}
        <div aria-hidden className="absolute inset-y-0 left-0 w-[5cqw] bg-[rgb(12_10_8/0.08)]" />
        <div aria-hidden className="absolute inset-y-0 left-[5cqw] w-[0.25cqw] bg-[rgb(12_10_8/0.18)]" />
        <div className="absolute top-[9cqw] left-[12cqw] aspect-[4/5] w-[54cqw] outline-[0.5cqw] outline-cloth-deep -outline-offset-[0.5cqw]">
          <Image src={photo} alt="" fill sizes="(min-width: 768px) 220px, 40vw" className="object-cover" priority={priority} />
        </div>
        <div className="text-cloth-ink absolute bottom-[18cqw] left-[12cqw]">
          <p className="leading-[0.9] font-bold tracking-[-0.035em]" style={{ ...display, fontSize: "11cqw", fontVariationSettings: '"wdth" 78, "opsz" 96' }}>
            {title}
          </p>
        </div>
        <p className="text-cloth-ink absolute top-[calc(100%-15.6cqw)] left-[12cqw] text-[3.6cqw] font-medium">{author}</p>
      </div>
    </div>
  );
}

/** Loser Abzug mit Papierrand */
function Print({ src, className = "", style, sizes = "200px", eager = false }: { src: StaticImageData; className?: string; style?: CSSProperties; sizes?: string; eager?: boolean }) {
  return (
    <div className={`bg-paper absolute p-[5px] ${print} ${className}`} style={style}>
      <Image src={src} alt="" sizes={sizes} loading={eager ? "eager" : "lazy"} className="block h-auto w-full" />
    </div>
  );
}

/** Zettel: dünnes, vergilbtes Papier, wie der Rezeptzettel im Buch */
function Slip({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`slip text-ink absolute p-3 text-[13px] leading-snug shadow-[0_10px_18px_-10px_rgb(12_10_8/0.8)] ${className}`} style={style}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ Kopf */

function Hero() {
  return (
    <section aria-labelledby="hero-h" className="linen table-surface relative overflow-hidden bg-table">
      <SunAndShade light="sun" />
      <header className="relative z-20 flex items-baseline justify-between gap-6 px-4 pt-4 md:px-8 md:pt-6">
        <p className="text-on-table text-lg font-bold tracking-[-0.02em]" style={narrow}>
          Fujiventura
        </p>
        <nav aria-label="Auf dieser Seite" className="hidden items-baseline gap-6 text-sm md:flex">
          <a href="#so-gehts" className="text-on-table-2 decoration-mark decoration-2 underline-offset-4 hover:text-on-table hover:underline">
            So geht’s
          </a>
          <a href="#was-es-kann" className="text-on-table-2 decoration-mark decoration-2 underline-offset-4 hover:text-on-table hover:underline">
            Was es kann
          </a>
          <HeaderSession />
        </nav>
        <span className="md:hidden">
          <HeaderSession />
        </span>
      </header>

      <div className="relative z-10 grid gap-14 px-4 pt-12 pb-20 md:grid-cols-12 md:items-end md:gap-8 md:px-8 md:pt-20 md:pb-28">
        <div className="md:col-span-7 md:pb-6">
          <p className="text-on-table-2 text-sm">Fotobücher zum Blättern</p>
          <h1 id="hero-h" className="text-on-table mt-4 leading-[0.84] font-bold tracking-[-0.04em]" style={{ ...display, fontSize: "clamp(56px, 10.5vw, 168px)" }}>
            Deine Fotos,
            <br />
            gebunden.
          </h1>
          <p className="text-on-table-2 mt-7 max-w-[32rem] text-lg leading-relaxed">
            Zieh einen Ordner Fotos auf die Werkbank. Fujiventura setzt sie zu Doppelseiten, legt das Fuji-Rezept als Zettel dazu und bindet
            ein Buch, das man wirklich umblättert.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <EnterButton />
            <a href="#so-gehts" className={`${linkClass} text-sm`}>
              Wie es geht
            </a>
          </div>
          <p className="text-on-table-2 mt-6 text-sm">Lesen geht ohne Konto. Gestalten mit deinem Google-Konto.</p>
        </div>

        {/* Ein Band und lose Abzüge: das Produkt als Gegenstand, bevor man etwas liest */}
        <div aria-hidden className="relative mx-auto aspect-[5/6] w-full max-w-[560px] md:col-span-5 md:mr-0">
          <Print src={felsbogen} eager sizes="(min-width: 768px) 320px, 60vw" className="top-[4%] left-[24%] w-[62%] rotate-[8deg]" />
          <Print src={stuehle} eager sizes="(min-width: 768px) 170px, 30vw" className="top-[34%] right-[0%] w-[30%] rotate-[-6deg]" />
          <Cover
            photo={palme}
            title="Sommer"
            author="Dein Name"
            priority
            className="hero-lift absolute bottom-[2%] left-[4%] w-[52%] rotate-[-4deg]"
          />
          <Slip className="bottom-[10%] right-[4%] w-[40%] rotate-[3deg]">
            <span className="block font-semibold">Classic Chrome</span>
            <span className="text-ink-2 block">Körnung schwach · Farbe +2</span>
          </Slip>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ So geht's */

const STEPS = [
  {
    no: "01",
    title: "Reinziehen",
    text: "Fotos vom Handy, von der Fuji oder aus Lightroom auf die Werkbank ziehen, auch HEIC und DNG. Sie ordnen sich nach Aufnahmezeit. Ortsdaten fallen beim Hochladen weg.",
  },
  {
    no: "02",
    title: "Setzen lassen",
    text: "Nach ein, zwei Sekunden steht ein Entwurf: Doppelseiten mit Rhythmus, randlose Bilder, kleine Tafeln, Bildunterschriften. Was dir nicht passt, ziehst du zurecht, schneidest zu oder schreibst darüber.",
  },
  {
    no: "03",
    title: "Hinlegen",
    text: "Für jede Person ein eigener Link. Sie blättert ohne Konto, auf dem Telefon Seite für Seite, und lässt dir Zettel und Eselsohren da, die nur du liest.",
  },
] as const;

/** Werkbank: Abzüge fallen in die Ablage, darunter die Zählung */
function BenchFig({ on }: { on: boolean }) {
  const prints = [
    { src: reifenThumb, x: "6%", y: "10%", r: -6 },
    { src: markisenThumb, x: "36%", y: "4%", r: 4 },
    { src: kaktusThumb, x: "64%", y: "14%", r: -3 },
    { src: hirscheThumb, x: "14%", y: "44%", r: 5 },
    { src: raupeThumb, x: "44%", y: "40%", r: -8 },
    { src: schildThumb, x: "68%", y: "50%", r: 3 },
  ];
  return (
    <div className="absolute inset-0 border border-dashed border-on-table-2/50">
      {prints.map((p, i) => (
        <div
          key={i}
          className="fig-drop bg-paper absolute w-[28%] p-[4px] shadow-[0_12px_20px_-10px_rgb(12_10_8/0.7)]"
          style={{ left: p.x, top: p.y, rotate: `${p.r}deg`, ["--i" as string]: i }}
          data-on={on}
        >
          <Image src={p.src} alt="" sizes="160px" className="block aspect-[3/4] h-auto w-full object-cover" />
        </div>
      ))}
      <p className="text-on-table-2 absolute bottom-3 left-4 text-sm">
        <span className="text-on-table">6 Fotos</span> · nach Aufnahmezeit
      </p>
    </div>
  );
}

/** Doppelseite: links randlos, rechts eine kleine Tafel mit Unterschrift; ein Blatt schlägt um */
function SpreadFig({ on }: { on: boolean }) {
  return (
    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
      <div className={`relative grid grid-cols-2 ${onTable} [perspective:2600px]`}>
        <div className="paper relative aspect-[2/3] overflow-hidden">
          <Image src={bougainvillea} alt="" fill sizes="(min-width: 768px) 260px, 45vw" className="object-cover" />
          <div aria-hidden className="absolute inset-y-0 right-0 w-[14%] bg-[linear-gradient(to_left,rgb(12_10_8/0.16),rgb(12_10_8/0.05)_30%,transparent)]" />
        </div>
        <div className="paper relative aspect-[2/3] overflow-hidden [container-type:inline-size]">
          <div className="absolute top-[9cqw] right-[12cqw] aspect-[2/3] w-[52cqw]">
            <Image src={rettungsturm} alt="" fill sizes="(min-width: 768px) 140px, 25vw" className="object-cover" />
          </div>
          <p className="text-ink-2 absolute top-[90cqw] right-[12cqw] text-right" style={{ fontSize: "max(11px, 3.1cqw)" }}>
            <span className="text-ink font-semibold">9</span>
            <span className="ml-[0.6em]">Rettungsturm</span>
          </p>
          <div aria-hidden className="absolute inset-y-0 left-0 w-[14%] bg-[linear-gradient(to_right,rgb(12_10_8/0.16),rgb(12_10_8/0.05)_30%,transparent)]" />
          {/* Blatt, das gerade umgeschlagen wird: dreht um den Bund und kommt flach auf der rechten Seite an */}
          <div className="fig-leaf paper absolute inset-0 origin-left" data-on={on}>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(12_10_8/0.12),transparent_40%)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Hinlegen: der Band mit Zettel hin, ein Zettel kommt zurück */
function ShareFig({ on }: { on: boolean }) {
  return (
    <div className="absolute inset-0">
      <Cover photo={torii} title="Japan" author="Michel Leotta" className="absolute top-[6%] left-[8%] w-[38%] -rotate-[3deg]" />
      <Slip className="top-[8%] right-[6%] w-[44%] rotate-[3deg]">
        Für Jana, von Michel
        <span className="text-ink-2 mt-1 block font-mono text-[11px] break-all">fujiventura.web.app/b?t=…</span>
      </Slip>
      {/* kommt zurück: der Zettel eines Gasts zu einer Tafel */}
      <Slip className="fig-return right-[4%] bottom-[10%] w-[48%] -rotate-[2deg]">
        <span data-on={on} className="fig-in block">
          <span className="text-ink-2 block text-[11px]">Zettel zu Tafel 7, von Jana</span>
          Das Tor im Regen hätte ich gern an der Wand.
        </span>
      </Slip>
    </div>
  );
}

const FIGS = [BenchFig, SpreadFig, ShareFig];

function HowItWorks() {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLLIElement | null)[]>([]);

  // Der Schritt in der Mitte des Fensters bestimmt das Bild links
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    steps.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="so-gehts" aria-labelledby="how-h" className="linen table-surface relative scroll-mt-4 bg-table-deep px-4 py-20 md:px-8 md:py-28">
      <div className="grid gap-6 md:grid-cols-12 md:gap-8">
        <p className="text-on-table-2 text-sm md:col-span-3">So geht’s</p>
        <h2 id="how-h" className="text-on-table text-4xl leading-[0.95] font-bold tracking-[-0.03em] md:col-span-9 md:text-6xl" style={display}>
          Vom Ordner zum Buch in drei Handgriffen.
        </h2>
      </div>

      <div className="mt-14 grid gap-8 md:mt-20 md:grid-cols-12">
        {/* Bild zum Schritt: klebt beim Scrollen, ab Tablet */}
        <div aria-hidden className="hidden md:col-span-6 md:block">
          <div className="sticky top-[12svh] aspect-[5/4] w-full max-w-[620px]">
            {FIGS.map((Fig, i) => (
              <div key={i} className="fig absolute inset-0" data-on={active === i}>
                <Fig on={active === i} />
              </div>
            ))}
          </div>
        </div>

        <ol className="md:col-span-5 md:col-start-8">
          {STEPS.map((s, i) => {
            const Fig = FIGS[i];
            return (
              <li
                key={s.no}
                ref={(el) => {
                  steps.current[i] = el;
                }}
                data-step={i}
                className="border-on-table-2/25 border-t py-8 md:flex md:min-h-[70svh] md:flex-col md:justify-center md:py-0"
              >
                <p className={`text-sm transition-colors duration-150 ${active === i ? "text-on-table" : "text-on-table-2"}`}>
                  <span aria-hidden className={`mr-3 inline-block h-[10px] w-[3px] align-baseline transition-[scale,background-color] duration-500 ${active === i ? "bg-mark scale-y-[1.9]" : "bg-on-table-2"}`} />
                  {s.no}
                </p>
                <h3 className="text-on-table mt-3 text-3xl font-bold tracking-[-0.025em] md:text-4xl" style={narrow}>
                  {s.title}
                </h3>
                <p className="text-on-table-2 mt-4 max-w-[30rem] text-base leading-relaxed md:text-lg">{s.text}</p>
                {/* auf dem Telefon steht das Bild beim Schritt */}
                <div aria-hidden className="relative mt-8 aspect-[5/4] w-full md:hidden">
                  <Fig on />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Was es kann */

const FEATURES = [
  {
    title: "Das Rezept liegt bei",
    text: "Filmsimulation, Körnung, Weißabgleich: Was die Fuji in die Datei schreibt, liegt als Zettel unter dem Foto. Lightroom-Presets kann man gleich als .xmp mitnehmen.",
  },
  {
    title: "Blättern wie Papier",
    text: "Die Blätter biegen sich beim Umschlagen und werfen Schatten auf die Seite darunter. Ab dem Tablet liegt eine Doppelseite offen, auf dem Telefon wischt man.",
  },
  {
    title: "Frei, wenn du willst",
    text: "Bilder schieben, zuschneiden, über den Bund ziehen. Text in vier Schriften, Linien, Pfeile, Klebestreifen und ein Stift. Jeder Handgriff lässt sich zurücknehmen.",
  },
  {
    title: "Nur für die, die du meinst",
    text: "Kein öffentliches Profil, kein Feed. Ein Buch sieht nur, wer den Link hat, und jeden Link kannst du einzeln zurückziehen.",
  },
] as const;

function Features() {
  return (
    <section id="was-es-kann" aria-labelledby="feat-h" className="linen table-surface relative scroll-mt-4 overflow-hidden bg-table px-4 py-20 md:px-8 md:py-28">
      <div className="grid gap-6 md:grid-cols-12 md:gap-8">
        <p className="text-on-table-2 text-sm md:col-span-3">Was es kann</p>
        <h2 id="feat-h" className="text-on-table text-4xl leading-[0.95] font-bold tracking-[-0.03em] md:col-span-9 md:text-6xl" style={display}>
          Ein Fotobuch, kein Album.
        </h2>
      </div>

      <div className="mt-14 grid gap-14 md:mt-20 md:grid-cols-12 md:gap-8">
        {/* Abzug mit Rezeptzettel: das, was nur Fujiventura so macht */}
        <figure aria-hidden className="relative mx-auto aspect-[4/5] w-full max-w-[420px] md:col-span-5 md:mx-0">
          <Print src={strand} sizes="(min-width: 768px) 360px, 80vw" className="top-[4%] left-[2%] w-[84%] -rotate-[3deg]" />
          <Slip className="right-[2%] bottom-[6%] w-[62%] rotate-[4deg] p-4">
            <span className="text-ink-2 block text-[11px]">Rezept</span>
            <span className="mt-1 block text-[15px] font-bold tracking-[-0.01em]">Classic Chrome</span>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[12px]">
              <dt className="text-ink-2">Dynamik</dt>
              <dd>DR200</dd>
              <dt className="text-ink-2">Lichter</dt>
              <dd>−1</dd>
              <dt className="text-ink-2">Schatten</dt>
              <dd>+1</dd>
              <dt className="text-ink-2">Farbe</dt>
              <dd>+2</dd>
              <dt className="text-ink-2">Körnung</dt>
              <dd>schwach, klein</dd>
            </dl>
            <span className="text-ink-2 mt-3 block text-[11px]">Beispielwerte</span>
          </Slip>
        </figure>

        <ul className="border-on-table border-t md:col-span-6 md:col-start-7">
          {FEATURES.map((f) => (
            <li key={f.title} className="border-on-table-2/25 group relative border-b py-7">
              {/* Signal beim Zeigen: der gelbe Balken links */}
              <span aria-hidden className="bg-mark absolute top-7 bottom-7 -left-4 w-[3px] origin-top scale-y-0 transition-transform duration-500 ease-out group-hover:scale-y-100 md:-left-6" />
              <h3 className="text-on-table text-xl font-semibold tracking-[-0.015em] transition-transform duration-500 ease-out group-hover:translate-x-[6px] md:text-2xl">
                {f.title}
              </h3>
              <p className="text-on-table-2 mt-2 max-w-[34rem] text-base leading-relaxed">{f.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Schluss */

function Closing() {
  return (
    <>
      <section aria-labelledby="end-h" className="linen table-surface relative bg-table-deep px-4 pt-20 pb-16 md:px-8 md:pt-32 md:pb-24">
        <h2 id="end-h" className="text-on-table max-w-[14ch] leading-[0.86] font-bold tracking-[-0.04em]" style={{ ...display, fontSize: "clamp(48px, 8.5vw, 136px)" }}>
          Leg deinen Sommer auf den Tisch.
        </h2>
        <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
          <EnterButton label="Erstes Buch anlegen" />
          <p className="text-on-table-2 text-sm">Anmeldung mit Google. Bücher sieht nur, wem du einen Link gibst.</p>
        </div>
      </section>
      <footer className="linen table-surface relative bg-table-deep px-4 pb-10 text-sm text-on-table-2 md:px-8">
        <div className="border-on-table-2/25 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t pt-6">
          <p>
            <span className="text-on-table font-semibold">Fujiventura</span> · Beispielfotos von Michel Leotta
          </p>
          <nav aria-label="Räume" className="flex gap-x-5">
            <Link href="/zimmer" className="decoration-mark decoration-2 underline-offset-4 hover:text-on-table hover:underline">
              Bücherzimmer
            </Link>
            <Link href="/tisch" className="decoration-mark decoration-2 underline-offset-4 hover:text-on-table hover:underline">
              Werkbank
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
      <HowItWorks />
      <Features />
      <Closing />
    </main>
  );
}
