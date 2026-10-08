"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import type { BookData } from "@/content/books";
import { ClosedBook } from "@/components/table";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/** Ein Platz im Karussell: ein Buch (mit dem, was darauf liegt) oder etwas anderes in Buchgröße, z. B. das leere Buch */
export type Slide = { key: string; book?: BookData; decor?: ReactNode; note?: string; tile?: ReactNode };

// Wo die Reihe stand, als ein Buch aufgeschlagen wurde: beim Zuklappen liegt dasselbe Buch wieder in der Mitte
const remembered = (id: string) => {
  try {
    return sessionStorage.getItem(`calima:reihe:${id}`);
  } catch {
    return null;
  }
};
const remember = (id: string, key: string) => {
  try {
    sessionStorage.setItem(`calima:reihe:${id}`, key);
  } catch {}
};

/** Größe und Licht jedes Buchs aus seinem Abstand zur Mitte; nur Stil am Buch selbst, kein React pro Frame. Gibt das mittlere zurück */
function paintRow(ul: HTMLElement) {
  const mid = ul.scrollLeft + ul.clientWidth / 2;
  let best = 0;
  let dist = Infinity;
  Array.from(ul.children).forEach((el, i) => {
    const li = el as HTMLElement;
    const d = li.offsetLeft + li.offsetWidth / 2 - mid;
    const p = Math.min(Math.abs(d) / (li.offsetWidth + 20), 1);
    li.style.setProperty("--p", p.toFixed(3));
    li.style.setProperty("--side", d < 0 ? "-1" : "1");
    if (Math.abs(d) < dist) {
      dist = Math.abs(d);
      best = i;
    }
  });
  return best;
}

/**
 * Eine Reihe im Bücherzimmer als Karussell: ein Buch liegt groß unter der Lampe, die Nachbarn rücken in den Halbschatten.
 * Größe und Licht hängen stufenlos am Finger (`--p` je Buch, 0 in der Mitte, 1 einen Platz daneben);
 * was unter dem Buch steht (`panel`), wechselt erst, wenn die Reihe eingerastet ist.
 * Ein Nachbar wird beim Antippen erst in die Mitte geholt, erst das Buch in der Mitte schlägt sich auf.
 * Ab 1024px steht das Panel rechts neben der Reihe.
 */
export function Carousel({
  id,
  heading,
  showHeading = true,
  slides,
  start = 0,
  panel,
  children,
}: {
  id: string;
  heading: string;
  /** sonst nur für Screenreader */
  showHeading?: boolean;
  slides: Slide[];
  /** Platz, der beim ersten Zeigen in der Mitte liegt (z. B. das Buch mit der neuesten Rückmeldung) */
  start?: number;
  panel: (slide: Slide) => ReactNode;
  children?: ReactNode;
}) {
  const list = useRef<HTMLUListElement>(null);
  const [near, setNear] = useState(0);
  const moving = useRef(false);
  const reduce = useReducedMotion();
  const books = slides.filter((s) => s.book).length;
  const shown = slides.length > 0;
  const clamp = (i: number) => Math.min(Math.max(i, 0), Math.max(0, slides.length - 1));
  // das Panel folgt dem Buch, das gerade am nächsten an der Mitte liegt, schon während des Wischens
  const current = clamp(near);

  const paint = () => (list.current ? paintRow(list.current) : 0);

  // Beim ersten Zeigen (und nach dem Zuklappen eines Buchs) ohne Bewegung an den richtigen Platz
  useLayoutEffect(() => {
    const ul = list.current;
    if (!ul) return;
    const key = remembered(id);
    const back = key === null ? -1 : slides.findIndex((s) => s.key === key);
    const i = clamp(back >= 0 ? back : start);
    const li = ul.children[i] as HTMLElement | undefined;
    if (li) ul.scrollLeft = li.offsetLeft - (ul.clientWidth - li.offsetWidth) / 2;
    paint();
    setNear(i);
    // nur beim Erscheinen der Reihe; spätere Wechsel macht der Finger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  useEffect(() => {
    const ul = list.current;
    const row = ul?.parentElement;
    if (!ul || !row) return;
    let frame = 0;
    let rest = 0;
    // Schwung: Zettel und Lampe hängen an einer Feder, die der Wischgeschwindigkeit folgt und nach dem Einrasten nachschwingt
    let lean = 0;
    let speed = 0;
    let target = 0;
    let lastX = ul.scrollLeft;
    let lastT = performance.now();
    let spring = 0;
    const step = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 1 / 30);
      lastT = t;
      // Feder mit Masse 1: Steifigkeit 300, Dämpfung 14 (schwingt einmal sichtbar nach)
      speed += (-300 * (lean - target) - 14 * speed) * dt;
      lean += speed * dt;
      target *= 0.85;
      row.style.setProperty("--lean", lean.toFixed(2));
      if (Math.abs(lean) > 0.02 || Math.abs(speed) > 0.05 || Math.abs(target) > 0.02) spring = requestAnimationFrame(step);
      else {
        spring = 0;
        row.style.setProperty("--lean", "0");
      }
    };
    const push = () => {
      const now = performance.now();
      const v = (ul.scrollLeft - lastX) / Math.max(now - lastT, 8);
      lastX = ul.scrollLeft;
      // nach links gewischt (Reihe läuft nach rechts) lehnen sich die Zettel nach links, wie vom Fahrtwind
      target = Math.max(-14, Math.min(14, -v * 9));
      if (!spring) {
        lastT = now;
        spring = requestAnimationFrame(step);
      }
    };
    const settle = () => {
      moving.current = false;
      const i = paint();
      setNear(i);
    };
    const onScroll = () => {
      moving.current = true;
      if (!reduce) push();
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          setNear(paint());
        });
      // Safari kennt scrollend erst seit Kurzem: nach 120 ms Ruhe gilt die Reihe als eingerastet
      window.clearTimeout(rest);
      rest = window.setTimeout(settle, 120);
    };
    const onResize = () => paint();
    ul.addEventListener("scroll", onScroll, { passive: true });
    ul.addEventListener("scrollend", settle);
    window.addEventListener("resize", onResize);
    return () => {
      ul.removeEventListener("scroll", onScroll);
      ul.removeEventListener("scrollend", settle);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(spring);
      window.clearTimeout(rest);
    };
  }, [shown, reduce]);

  // neue Bücher (z. B. nach dem Laden der Geschenke) bekommen ihre Größe sofort
  useEffect(() => {
    paint();
  }, [slides.length]);

  const go = (i: number) => {
    const ul = list.current;
    const li = ul?.children[clamp(i)] as HTMLElement | undefined;
    if (!ul || !li) return;
    ul.scrollTo({ left: li.offsetLeft - (ul.clientWidth - li.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  };

  const slide = slides[current];

  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid scroll-mt-6 gap-2">
      <div className={showHeading ? "border-on-table-2/60 flex items-baseline gap-3 border-t pt-3" : "sr-only"}>
        <h2 id={`${id}-h`} className="text-on-table text-[22px] font-bold tracking-[-0.015em]" style={{ fontVariationSettings: '"wdth" 80' }}>
          {heading}
        </h2>
        <span className="text-on-table-2 text-sm">{books}</span>
      </div>
      {shown && (
        <div className="room-row">
          <div className="relative min-w-0">
            {/* die Lampe über dem Tisch: warmes Licht in der Mitte, der Rand fällt ab */}
            <div aria-hidden className="room-lamp" />
            <ul
              ref={list}
              className="carousel relative"
              aria-label={heading}
              aria-roledescription="Karussell"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "ArrowRight") go(near + 1);
                else if (e.key === "ArrowLeft") go(near - 1);
                else if (e.key === "Home") go(0);
                else if (e.key === "End") go(slides.length - 1);
                else return;
                e.preventDefault();
              }}
            >
              {slides.map((s, i) => {
                const pick = () => {
                  if (moving.current) return true;
                  if (i === near) {
                    remember(id, s.key);
                    return false;
                  }
                  go(i);
                  return true;
                };
                return s.book ? (
                  <ClosedBook
                    key={s.key}
                    book={s.book}
                    index={i}
                    note={s.note}
                    bare
                    decor={
                      <>
                        {s.decor}
                        {/* Glanz auf dem Leinen: wandert mit der Drehung über den Einband */}
                        <span aria-hidden className="cover-sheen">
                          <span />
                        </span>
                        {/* Halbschatten für die Nachbarn: liegt nur auf dem Einband, nicht auf dem Tisch */}
                        <span aria-hidden className="cover-shade" />
                      </>
                    }
                    onPick={pick}
                  />
                ) : (
                  <li
                    key={s.key}
                    className="relative"
                    onClickCapture={(e) => {
                      if (!pick()) return;
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    {s.tile}
                    <span aria-hidden className="cover-shade" />
                  </li>
                );
              })}
            </ul>
            {slides.length > 1 && (
              <>
                {/* Pfeile nur mit Maus; auf dem Telefon wischt man */}
                <button type="button" onClick={() => go(near - 1)} disabled={near === 0} className="room-arrow left-0" aria-label="Voriges Buch">
                  <span aria-hidden>←</span>
                </button>
                <button
                  type="button"
                  onClick={() => go(near + 1)}
                  disabled={near === slides.length - 1}
                  className="room-arrow right-0"
                  aria-label="Nächstes Buch"
                >
                  <span aria-hidden>→</span>
                </button>
                <div className="flex justify-center">
                  {slides.map((s, i) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => go(i)}
                      aria-label={`${s.book?.title ?? "Neues Buch"}, ${i + 1} von ${slides.length}`}
                      aria-current={i === near}
                      className="group grid h-6 w-5 place-items-center"
                    >
                      <span aria-hidden className={`room-dot ${i === near ? "is-on" : ""}`} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* wechselt, sobald ein anderes Buch näher an der Mitte liegt; der Schlüssel spielt das Einblenden einmal ab */}
          <div className="room-panel" aria-live="polite">
            <div key={slide?.key} className="room-panel-in">
              {slide && panel(slide)}
            </div>
          </div>
        </div>
      )}
      {children}
    </section>
  );
}

/** Zettel, die oben aus dem Buch schauen: bei wem es liegt; ein Bernsteinstrich, wenn von dort etwas Neues kam */
export function SlipTabs({ names, fresh = [] }: { names: string[]; fresh?: string[] }) {
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  return (
    <>
      {shown.map((n, i) => (
        <span
          key={n}
          aria-hidden
          className="slip-tab"
          style={{ left: `${9 + i * 29}%`, ["--r" as string]: `${[-2, 1.5, -1][i]}deg`, ["--k" as string]: [1, 0.8, 1.15][i], translate: `0 ${[0, 4, 1][i]}px` }}
        >
          {fresh.includes(n) && <span className="bg-mark absolute inset-x-0 top-0 h-[3px]" />}
          {i === 2 && rest > 0 ? `+${rest + 1}` : n}
        </span>
      ))}
    </>
  );
}

/** Umgeknickte Ecke oben rechts auf dem Einband: darunter Vorsatzpapier, der Knick wirft einen Schatten */
export function CoverEar() {
  return (
    <span aria-hidden className="cover-ear">
      <span className="cover-ear-under" />
      <span className="cover-ear-fold" />
    </span>
  );
}
