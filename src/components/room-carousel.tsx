"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import type { BookData } from "@/content/books";
import { roomLoadingSeen } from "@/components/room-loading";
import { ClosedBook } from "@/components/table";
import { haptic } from "@/lib/haptics";
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

// Was je Buch beim Wischen bewegt wird; einmal gesucht und gemerkt
type Parts = { rot: number; shade: HTMLElement | null; sheen: HTMLElement | null };
const partsCache = new WeakMap<HTMLElement, Parts>();
function partsOf(li: HTMLElement): Parts {
  let p = partsCache.get(li);
  if (!p) {
    p = {
      rot: parseFloat(li.style.getPropertyValue("--rot")) || 0,
      shade: li.querySelector<HTMLElement>(".cover-shade"),
      sheen: li.querySelector<HTMLElement>(".cover-sheen > span"),
    };
    partsCache.set(li, p);
  }
  return p;
}

/**
 * Lage, Licht und Stapelreihenfolge jedes Buchs aus seinem Abstand zur Mitte. Gibt das mittlere zurück.
 * Absichtlich ohne CSS-Variablen: eine Variable am Buch ließe den Browser bei jedem Bild alle Stile darunter neu
 * berechnen (gemessen: der Großteil der Rechenzeit beim Wischen). transform und opacity direkt am Element
 * erledigt die Grafikkarte. Erst alles messen, dann schreiben, sonst rechnet der Browser zwischendurch das Layout.
 */
function paintRow(ul: HTMLElement, flat: boolean) {
  const mid = ul.scrollLeft + ul.clientWidth / 2;
  const items = Array.from(ul.children) as HTMLElement[];
  const geo = items.map((li) => [li.offsetLeft + li.offsetWidth / 2 - mid, li.offsetWidth + 20]);
  let best = 0;
  let dist = Infinity;
  items.forEach((li, i) => {
    const [d, w] = geo[i];
    // 0 = Mitte, 1 = Nachbar, 2 = zweiter Nachbar (liegt noch tiefer im Stapel)
    const p = Math.min(Math.abs(d) / w, 2);
    const q = Math.min(p, 1);
    const side = d < 0 ? -1 : 1;
    const { rot, shade, sheen } = partsOf(li);
    // Stapel: die Nachbarn rutschen unter das mittlere Buch; beim Wischen kippen sie leicht, das mittlere liegt fast gerade
    li.style.transform =
      `translate(${(side * -42 * p).toFixed(2)}%, ${(-6 * (1 - q)).toFixed(2)}px) scale(${(1 - 0.14 * p).toFixed(4)}) ` +
      (flat ? "" : `perspective(1000px) rotateY(${(side * -14 * q).toFixed(2)}deg) `) +
      `rotate(${(rot * (0.35 + 0.65 * q)).toFixed(2)}deg)`;
    li.style.zIndex = String(100 - Math.round(p * 40));
    if (shade) shade.style.opacity = (0.4 * p).toFixed(3);
    if (sheen) {
      // Glanz nur während des Drehens, in der Mitte und ganz außen ist er weg
      sheen.style.opacity = flat ? "0" : Math.max(0, p * (1 - p) * 4).toFixed(3);
      sheen.style.transform = `translateX(${(side * (p - 0.5) * 26).toFixed(2)}%)`;
    }
    if (Math.abs(d) < dist) {
      dist = Math.abs(d);
      best = i;
    }
  });
  return best;
}

/** Wo die Reihe steht, wenn Buch i in der Mitte liegt */
function slideLeft(ul: HTMLElement, i: number) {
  const li = ul.children[Math.min(Math.max(i, 0), ul.children.length - 1)] as HTMLElement | undefined;
  return li ? li.offsetLeft - (ul.clientWidth - li.offsetWidth) / 2 : ul.scrollLeft;
}

function scrollToSlide(ul: HTMLElement, i: number, reduce: boolean) {
  ul.scrollTo({ left: slideLeft(ul, i), behavior: reduce ? "auto" : "smooth" });
}

/** Buch, das bei dieser Scrollposition der Mitte am nächsten läge */
function nearestSlide(ul: HTMLElement, left: number) {
  let best = 0;
  for (let i = 1; i < ul.children.length; i++) if (Math.abs(slideLeft(ul, i) - left) < Math.abs(slideLeft(ul, best) - left)) best = i;
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

  const paint = () => (list.current ? paintRow(list.current, reduce) : 0);

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

  // Lag beim Laden der Zettel auf dem Tisch, landen die Bücher darauf, statt hereinzugleiten (room-loading.tsx)
  useLayoutEffect(() => {
    const ul = list.current;
    if (!ul || !roomLoadingSeen()) return;
    ul.classList.add("is-landing");
    const t = window.setTimeout(() => ul.classList.remove("is-landing"), 900);
    return () => window.clearTimeout(t);
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
    const lamp = row.querySelector<HTMLElement>(".room-lamp");
    const step = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 1 / 30);
      lastT = t;
      // Feder mit Masse 1: Steifigkeit 300, Dämpfung 14 (schwingt einmal sichtbar nach)
      speed += (-300 * (lean - target) - 14 * speed) * dt;
      lean += speed * dt;
      target *= 0.85;
      const done = !(Math.abs(lean) > 0.02 || Math.abs(speed) > 0.05 || Math.abs(target) > 0.02);
      if (done) lean = 0;
      // direkt an Zetteln und Lampe, nicht als Variable an der Reihe (siehe paintRow)
      row.querySelectorAll<HTMLElement>(".slip-tab").forEach((tab) => {
        tab.style.rotate = `${(Number(tab.dataset.r) + lean * Number(tab.dataset.k)).toFixed(2)}deg`;
      });
      if (lamp) lamp.style.translate = `${(lean * 1.4).toFixed(2)}px 0`;
      spring = done ? 0 : requestAnimationFrame(step);
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
    let landed = paintRow(ul, reduce);
    const settle = () => {
      moving.current = false;
      const i = paintRow(ul, reduce);
      // in der App ein leises Klicken, wenn ein anderes Buch eingerastet ist
      if (i !== landed) haptic("select");
      landed = i;
      setNear(i);
    };
    const onScroll = () => {
      moving.current = true;
      if (!reduce) push();
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          setNear(paintRow(ul, reduce));
        });
      // Safari kennt scrollend erst seit Kurzem: nach 120 ms Ruhe gilt die Reihe als eingerastet
      window.clearTimeout(rest);
      rest = window.setTimeout(settle, 120);
    };
    const onResize = () => paintRow(ul, reduce);
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
    if (list.current) paintRow(list.current, reduce);
  }, [slides.length, reduce]);

  const go = (i: number) => {
    if (list.current) scrollToSlide(list.current, i, reduce);
  };

  // Mit der Maus ziehen wie mit dem Finger: die Reihe folgt dem Zeiger, beim Loslassen läuft sie mit Schwung aus
  // und rastet ein. Trackpad (seitlich wischen) und Touch scrollen ohnehin nativ; Klick nach dem Ziehen öffnet nichts.
  useEffect(() => {
    const ul = list.current;
    if (!ul) return;
    let drag: { id: number; x: number; left: number; t: number; v: number; moved: boolean } | null = null;
    let release = 0;
    const loosen = () => {
      window.clearTimeout(release);
      ul.classList.remove("is-dragging");
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      loosen();
      drag = { id: e.pointerId, x: e.clientX, left: ul.scrollLeft, t: e.timeStamp, v: 0, moved: false };
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved) {
        if (Math.abs(dx) < 4) return;
        drag.moved = true;
        moving.current = true;
        ul.setPointerCapture(e.pointerId);
        // ohne Einrasten, solange die Hand zieht
        ul.classList.add("is-dragging");
      }
      const left = drag.left - dx;
      const dt = Math.max(e.timeStamp - drag.t, 1);
      drag.v = 0.7 * ((left - ul.scrollLeft) / dt) + 0.3 * drag.v;
      drag.t = e.timeStamp;
      ul.scrollLeft = left;
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { moved, v, t } = drag;
      drag = null;
      if (!moved) return;
      // Schwung: je schneller losgelassen, desto weiter; wer vor dem Loslassen anhält, bleibt beim nächsten Buch
      const fling = e.timeStamp - t > 80 ? 0 : v * 220;
      scrollToSlide(ul, nearestSlide(ul, ul.scrollLeft + fling), reduce);
      // Einrasten erst wieder, wenn die Reihe steht
      ul.addEventListener("scrollend", loosen, { once: true });
      release = window.setTimeout(() => {
        loosen();
        // stand die Reihe schon richtig, kam kein Scrollen und damit kein Einrasten: Klicks wieder zulassen
        moving.current = false;
      }, 900);
    };
    ul.addEventListener("pointerdown", down);
    ul.addEventListener("pointermove", move);
    ul.addEventListener("pointerup", up);
    ul.addEventListener("pointercancel", up);
    return () => {
      ul.removeEventListener("pointerdown", down);
      ul.removeEventListener("pointermove", move);
      ul.removeEventListener("pointerup", up);
      ul.removeEventListener("pointercancel", up);
      loosen();
    };
  }, [shown, reduce]);

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
              // Fotos nicht als Bild aus der Reihe ziehen, die Maus zieht die Reihe
              onDragStart={(e) => e.preventDefault()}
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
                      // Trefferfläche 44 hoch, die Reihe bleibt so flach wie die Punkte
                      className="group -my-2.5 grid h-11 w-7 place-items-center"
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
          // Grunddrehung und wie stark der Zettel beim Wischen nachweht (Feder im Karussell)
          data-r={[-2, 1.5, -1][i]}
          data-k={[1, 0.8, 1.15][i]}
          style={{ left: `${9 + i * 29}%`, rotate: `${[-2, 1.5, -1][i]}deg`, translate: `0 ${[0, 4, 1][i]}px` }}
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
