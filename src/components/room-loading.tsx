"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Ladehinweis im Bücherzimmer: die Lampe wird hell, und wo gleich das Buch liegt, liegt ein Zettel aus dem Notizblock,
 * auf den sich mit Bleistift „Moment, ich hol deine Bücher.“ schreibt. Reines CSS, damit er schon im vorgerenderten
 * leeren Tisch läuft, bevor JavaScript da ist. Erst nach 0,3 s sichtbar (schnelles Wiederkommen blitzt nicht auf),
 * nach 4 s kommt eine Zeile dazu, nach 12 s noch eine. Kommen die Bücher, landen sie auf dem Zettel (room-carousel.tsx).
 *
 * Der Hinweis liegt erst auf dem leeren Tisch (vor dem Anmeldestand) und danach als Platzhalter in der Reihe.
 * Damit das ein durchgehendes Laden ist, setzt der zweite die Animationen dort fort, wo der erste war (--rl-t).
 */

/** Wann der Hinweis auf den Tisch kam (Zeitachse von performance.now) und wann der letzte wieder weg war */
let since: number | null = null;
let gone: number | null = null;
let mounted = 0;

/** Lag der Hinweis lange genug, dass man ihn gesehen hat, und ist er gerade erst gegangen? Dann landen die Bücher. */
export function roomLoadingSeen() {
  if (since === null) return false;
  const now = performance.now();
  if (mounted > 0) return now - since > 300;
  return gone !== null && gone - since > 300 && now - gone < 1500;
}

// Bleistiftschrift: jeder Buchstabe etwas anders gedreht und versetzt. Feste Werte statt Zufall,
// damit Vorrendern und Browser dasselbe zeichnen.
const JITTER = [1.6, -1.1, 0.4, -2, 1.1, -0.5, 2.1, -1.5, 0.7, -0.2, 1.8, -2.3, 0.2, 1.3, -0.8];

function Hand({ text, from = 0, own = false }: { text: string; from?: number; own?: boolean }) {
  let i = from;
  return text.split(" ").map((word, w) => (
    <span key={w} className="rl-w">
      {w > 0 && " "}
      {[...word].map((c) => {
        const k = i++;
        const j = JITTER[k % JITTER.length];
        return (
          <span key={k} className="rl-ch" style={{ "--i": own ? k - from : k, "--r": `${j}deg`, "--y": `${(j * 0.012).toFixed(3)}em` } as React.CSSProperties}>
            {c}
          </span>
        );
      })}
    </span>
  ));
}

export function RoomLoading() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const now = performance.now();
    // ein Hinweis von einem früheren Besuch zählt nicht; einer, der eben erst ging, wird fortgesetzt
    if (mounted === 0 && gone !== null && now - gone > 1000) since = null;
    mounted++;
    gone = null;
    if (since === null) {
      // vorgerendert läuft die Animation schon seit dem ersten Bild; ihre Startzeit steht auf derselben Zeitachse
      const start = el.getAnimations?.({ subtree: true }).find((a) => a.startTime !== null)?.startTime;
      since = typeof start === "number" ? Math.min(start, now) : now;
    } else {
      el.style.setProperty("--rl-t", `${(since - now).toFixed(0)}ms`);
    }
    return () => {
      mounted--;
      if (mounted === 0) gone = performance.now();
    };
  }, []);

  return (
    <div ref={ref} className="room-loading carousel" data-room-loading="">
      <span role="status" className="sr-only">
        Bücherzimmer wird geladen
      </span>
      <div aria-hidden className="rl-lamp" />
      <div aria-hidden className="rl-paper">
        <div className="rl-under" />
        <div className="rl-note">
          <span className="rl-ln">
            <Hand text="Moment," />
          </span>
          <span className="rl-ln">
            <Hand text="ich hol deine" from={7} />
          </span>
          <span className="rl-ln">
            <Hand text="Bücher." from={18} />
          </span>
          <svg className="rl-line" viewBox="0 0 100 10" preserveAspectRatio="none">
            <path d="M2 6 C 25 3, 55 8, 97 4" />
          </svg>
          <span className="rl-ln rl-later rl-l1">
            <Hand text="dauert heut" from={0} own />
          </span>
          <span className="rl-ln rl-later rl-l2">
            <Hand text="kein Netz?" from={0} own />
          </span>
        </div>
      </div>
    </div>
  );
}
