"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { countWord, plates } from "@/content/plates";

const EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";
const IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";
const WORD = "FUJIVENTURA";

// feste Streuung, damit Server und Browser denselben Stapel zeigen
const scatter = plates.map((_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.678;
  const f = (v: number) => v - Math.floor(v);
  return { rot: (f(a) - 0.5) * 26, dx: (f(b) - 0.5) * 9, dy: (f(a * 1.7) - 0.5) * 7 };
});

/** Wurde der Einstieg schon gezeigt? Das Skript im Layout setzt html.intro */
const introActive = () => document.documentElement.classList.contains("intro");

export const INTRO_DONE = "fuji:intro-done";

export function Intro() {
  const root = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el || !introActive()) {
      setGone(true);
      return;
    }
    const anims: Animation[] = [];
    const timers: number[] = [];
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      document.documentElement.classList.remove("intro");
      try {
        sessionStorage.setItem("intro", "1");
      } catch {}
      window.dispatchEvent(new Event(INTRO_DONE));
      setGone(true);
    };

    const leave = (fast: boolean) => {
      const out = el.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: fast ? 320 : 700,
        delay: fast ? 0 : 420,
        easing: "ease-out",
        fill: "forwards",
      });
      out.finished.then(finish, finish);
    };

    const prints = Array.from(el.querySelectorAll<HTMLElement>("[data-print]"));
    prints.forEach((p, i) => {
      const s = scatter[i];
      // Abzüge fallen nacheinander auf den Tisch
      anims.push(
        p.animate(
          [
            { opacity: 0, transform: `translate(${s.dx}vw, -70vh) rotate(${s.rot - 24}deg) scale(1.18)` },
            { opacity: 1, transform: `translate(${s.dx}vw, ${s.dy}vh) rotate(${s.rot}deg) scale(1)` },
          ],
          { duration: 760, delay: 180 + i * 52, easing: EXPO, fill: "both" },
        ),
      );
      timers.push(window.setTimeout(() => setCount(i + 1), 180 + i * 52 + 420));
      // danach schiebt sich der Stapel zu einem Buch zusammen
      anims.push(
        p.animate(
          [
            { transform: `translate(${s.dx}vw, ${s.dy}vh) rotate(${s.rot}deg) scale(1)` },
            { transform: "translate(0, 0) rotate(0deg) scale(0.72)", opacity: 1 },
          ],
          { duration: 620, delay: 2500, easing: IN_OUT, fill: "forwards", composite: "replace" },
        ),
      );
    });

    const letters = Array.from(el.querySelectorAll<HTMLElement>("[data-letter]"));
    letters.forEach((l, i) =>
      anims.push(
        l.animate([{ transform: "translateY(105%)" }, { transform: "translateY(0)" }], {
          duration: 900,
          delay: 900 + i * 38,
          easing: EXPO,
          fill: "both",
        }),
      ),
    );
    const sub = el.querySelector<HTMLElement>("[data-sub]");
    if (sub) {
      anims.push(
        sub.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], {
          duration: 700,
          delay: 1650,
          easing: EXPO,
          fill: "both",
        }),
      );
    }
    timers.push(window.setTimeout(() => leave(false), 2700));

    // Wer scrollt, tippt oder eine Taste drückt, will sofort ins Buch
    const skip = () => {
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.finish());
      leave(true);
      off();
    };
    const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    const off = () => events.forEach((e) => window.removeEventListener(e, skip));
    events.forEach((e) => window.addEventListener(e, skip, { passive: true, once: true }));

    return () => {
      off();
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.cancel());
    };
  }, []);

  if (gone) return null;

  return (
    <div
      ref={root}
      aria-hidden
      className="intro-cover linen fixed inset-0 z-[600] overflow-hidden bg-table"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {plates.map((p) => {
          const landscape = p.src.width > p.src.height;
          return (
            <div
              key={p.no}
              data-print
              className="absolute bg-paper p-[5px] opacity-0 shadow-[0_18px_30px_-12px_rgb(4_24_27/0.6),0_2px_4px_rgb(4_24_27/0.25)]"
              style={{ width: landscape ? "min(46vw, 330px)" : "min(32vw, 220px)" }}
            >
              <Image
                src={p.thumb}
                alt=""
                sizes="330px"
                className="block h-auto w-full"
                loading="eager"
                placeholder="blur"
              />
            </div>
          );
        })}
      </div>

      <p className="text-on-table-2 absolute top-4 right-4 text-sm md:top-6 md:right-8">
        <span className="text-on-table inline-block w-[2ch] text-right">{String(count).padStart(2, "0")}</span>
        <span className="mx-2">/</span>
        {plates.length}
      </p>

      <div className="absolute right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 md:right-8 md:bottom-8 md:left-8">
        <p
          className="text-on-table flex overflow-hidden leading-[0.82] font-bold tracking-[-0.035em]"
          style={{ fontSize: "clamp(56px, 15.5vw, 230px)", fontVariationSettings: '"wdth" 75, "opsz" 96' }}
        >
          {WORD.split("").map((c, i) => (
            <span key={i} data-letter className="inline-block pb-[0.06em]" style={{ transform: "translateY(105%)" }}>
              {c}
            </span>
          ))}
        </p>
        <p data-sub className="text-on-table-2 mt-3 text-base opacity-0 md:mt-4 md:text-lg">
          {countWord} Fotografien von Fuerteventura · Michel Leotta
        </p>
      </div>
    </div>
  );
}
