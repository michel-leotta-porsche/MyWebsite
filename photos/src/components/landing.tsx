"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { books } from "@/content/books";
import { FrameButton, linkClass, TextButton } from "@/components/app-ui";
import { SunAndShade } from "@/components/sun-and-shade";
import { signIn } from "@/lib/firebase";
import { useUser } from "@/lib/use-user";

// Landing Page: oben der Weg hinein, darunter Michels Bücher als Leseprobe, unten die drei Räume.

const display = { fontVariationSettings: '"wdth" 75, "opsz" 96' };

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

function EnterButton() {
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
      {busy ? "Einen Moment …" : "Mit Google anmelden"}
    </FrameButton>
  );
}

// Abzüge, die lose auf dem Tisch liegen: aus beiden Büchern, leicht gedreht
const PRINTS = [
  { book: 0, no: 3, rot: -7, x: "2%", y: "16%", w: "54%" },
  { book: 1, no: 2, rot: 5, x: "40%", y: "2%", w: "44%" },
  { book: 0, no: 11, rot: -2, x: "38%", y: "40%", w: "48%" },
  { book: 1, no: 7, rot: 9, x: "0%", y: "58%", w: "38%" },
];

function Prints() {
  return (
    <div aria-hidden className="group relative mx-auto aspect-[4/5] w-full max-w-[520px]">
      {PRINTS.map((p, i) => {
        const plate = books[p.book].plates[p.no - 1];
        if (!plate) return null;
        return (
          <div
            key={i}
            className="bg-paper absolute p-[5px] group-hover:translate-x-(--spread) shadow-[0_18px_30px_-12px_rgb(12_10_8/0.6),0_2px_4px_rgb(12_10_8/0.25)] transition-transform duration-500 ease-out"
            style={{
              left: p.x,
              top: p.y,
              width: p.w,
              rotate: `${p.rot}deg`,
              // beim Überfahren rücken die Abzüge etwas auseinander, wie unter der Hand
              ["--spread" as string]: `${(i - 1.5) * 10}px`,
            }}
          >
            <Image
              src={plate.thumb}
              alt=""
              sizes="(min-width: 768px) 300px, 60vw"
              className="block h-auto w-full"
              loading="eager"
              fetchPriority={i === 2 ? "high" : "auto"}
            />
          </div>
        );
      })}
    </div>
  );
}

export function LandingHero() {
  return (
    <section aria-labelledby="hero-h" className="linen table-surface relative overflow-hidden bg-table">
      <SunAndShade light="sun" />
      <header className="relative z-20 flex items-baseline justify-between gap-6 px-4 pt-4 md:px-8 md:pt-6">
        <p className="text-on-table text-lg font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
          Fujiventura
        </p>
        <HeaderSession />
      </header>
      <div className="relative z-10 grid gap-12 px-4 pt-14 pb-20 md:grid-cols-12 md:items-center md:gap-8 md:px-8 md:pt-16 md:pb-28">
        <div className="md:col-span-7">
          <p className="text-on-table-2 text-sm">Fotobücher zum Blättern</p>
          <h1
            id="hero-h"
            className="text-on-table mt-4 leading-[0.86] font-bold tracking-[-0.035em]"
            style={{ ...display, fontSize: "clamp(52px, 9.5vw, 148px)" }}
          >
            Deine Fotos, gebunden.
          </h1>
          <p className="text-on-table-2 mt-6 max-w-[34rem] text-lg leading-relaxed">
            Zieh deine Fotos auf die Werkbank. Fujiventura setzt sie zu Doppelseiten, liest das Fuji-Rezept aus der Datei und bindet
            ein Buch, das man wirklich umblättert. Dann legst du es Freunden hin.
          </p>
          <div className="mt-9 flex flex-wrap items-baseline gap-x-7 gap-y-4">
            <EnterButton />
            <a href="#leseprobe" className={`${linkClass} text-sm`}>
              Erst mal reinblättern
            </a>
          </div>
        </div>
        <div className="md:col-span-5">
          <Prints />
        </div>
      </div>
    </section>
  );
}

const ROOMS = [
  {
    no: "01",
    name: "Werkbank",
    text: "Fotos reinziehen. Sie werden nach Aufnahmezeit sortiert und zu Doppelseiten gesetzt; Rezept und Kameradaten kommen aus der Datei, GPS-Daten fallen weg.",
  },
  {
    no: "02",
    name: "Hinlegen",
    text: "Ein Link für eine Person. Sie blättert ohne Konto und lässt dir Zettel und Eselsohren da.",
  },
  {
    no: "03",
    name: "Bücherzimmer",
    text: "Deine Bücher und die, die dir Freunde hingelegt haben, an einem Ort zum Lesen.",
  },
];

export function LandingRooms() {
  return (
    <>
      <section aria-labelledby="rooms-h" className="linen table-surface relative bg-table-deep px-4 py-20 md:px-8 md:py-28">
        <div className="grid gap-8 md:grid-cols-12">
          <p className="text-on-table-2 text-sm md:col-span-3">So geht es</p>
          <h2 id="rooms-h" className="text-on-table text-3xl leading-tight font-bold tracking-[-0.03em] md:col-span-9 md:text-5xl" style={display}>
            Drei Räume, ein Konto.
          </h2>
        </div>
        <ol className="mt-12 grid gap-px bg-on-table-2/25 md:mt-16 md:grid-cols-3">
          {ROOMS.map((r) => (
            <li key={r.no} className="bg-table-deep py-6 md:px-6 md:py-8 md:first:pl-0">
              <p className="text-on-table-2 text-sm">{r.no}</p>
              <h3 className="text-on-table mt-3 text-2xl font-semibold tracking-[-0.02em]">{r.name}</h3>
              <p className="text-on-table-2 mt-3 max-w-[30rem] text-base leading-relaxed">{r.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-16 flex flex-wrap items-baseline gap-x-7 gap-y-4">
          <EnterButton />
          <p className="text-on-table-2 text-sm">Anmeldung mit deinem Google-Konto. Bücher sieht nur, wem du einen Link gibst.</p>
        </div>
      </section>
      <footer className="linen table-surface relative bg-table-deep px-4 pt-6 pb-10 text-sm text-on-table-2 md:px-8">
        <p className="border-t border-on-table-2/25 pt-6">
          <span className="font-semibold text-on-table">Fujiventura</span> · Fotografien von Michel Leotta, Fuerteventura und Japan
        </p>
      </footer>
    </>
  );
}
