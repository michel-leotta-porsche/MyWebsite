"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";

import { plateOf, type BookData } from "@/content/books";
import { buttonClass } from "@/components/ui/button-class";
import { useT } from "@/lib/i18n";

/** „Tafel 3: Titel“ in der gewählten Sprache */
export function usePlateName() {
  const t = useT();
  return (no: number, title?: string) => (title?.trim() ? t("Tafel {no}: {title}", { no, title: title.trim() }) : t("Tafel {no}", { no }));
}

type Open = (no: number, trigger: HTMLElement) => void;
const OpenContext = createContext<Open>(() => {});
export const PlateOpenProvider = OpenContext.Provider;

/** Unsichtbare Fläche über einer Tafel: Klick hebt sie aus dem Buch */
export function PlateButton({ book, no }: { book: BookData; no: number }) {
  const open = useContext(OpenContext);
  const t = useT();
  const plateName = usePlateName();
  return (
    <button
      type="button"
      aria-label={t("{plate} vergrößern", { plate: plateName(no, plateOf(book, no).title) })}
      onClick={(e) => {
        e.stopPropagation();
        open(no, e.currentTarget);
      }}
      className="absolute inset-0 z-10 cursor-zoom-in focus-visible:outline-ink focus-visible:-outline-offset-4"
    />
  );
}

const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

// History-Eintrag der offenen Tafel: die Zurück-Geste schließt nur die Vergrößerung, nicht das Buch
const HISTORY_KEY = "fujiPlate";
const isPlateEntry = () => !!(history.state as Record<string, unknown> | null)?.[HISTORY_KEY];

function fit(book: BookData, no: number) {
  const { width, height } = plateOf(book, no).src;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Platz für Kopf und Bedienung wächst mit der Schriftgröße
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  // Wenig Höhe (Telefon quer): Bild über die volle Höhe, Bedienung rechts daneben, wenn dort Platz ist
  if (vh < 560 && vw > vh) {
    const s = Math.min((vh - 16) / height, (vw * 0.96) / width);
    const w = width * s;
    const h = height * s;
    const side = (vw - w) / 2;
    if (side >= 8 * rem) return { left: side, top: (vh - h) / 2, width: w, height: h, side };
  }
  const top = Math.max(56, 3.5 * rem);
  const bottom = Math.max(64, 4.5 * rem);
  const maxW = vw * (vw < 768 ? 0.96 : 0.84);
  const maxH = Math.max(120, vh - top - bottom);
  const s = Math.min(maxW / width, maxH / height);
  const w = width * s;
  const h = height * s;
  return { left: (vw - w) / 2, top: Math.max(top, (vh - h) / 2 - 18), width: w, height: h, side: 0 };
}

export function PlateViewer({
  book,
  no,
  from,
  reduce,
  findRect,
  onClose,
}: {
  book: BookData;
  no: number;
  from: DOMRect | null;
  reduce: boolean;
  /** Wo liegt die Tafel gerade im Buch (für den Rückweg) */
  findRect: (no: number) => DOMRect | null;
  onClose: (current: number) => void;
}) {
  const [current, setCurrent] = useState(no);
  const [box, setBox] = useState<ReturnType<typeof fit> | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const p = plateOf(book, current);
  const t = useT();
  const plateName = usePlateName();

  useLayoutEffect(() => {
    const update = () => setBox(fit(book, current));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [book, current]);

  // Hinweg: von der Seite im Buch auf volle Größe
  const opened = useRef(false);
  useLayoutEffect(() => {
    if (!box || opened.current || !frame.current) return;
    opened.current = true;
    closeBtn.current?.focus({ preventScroll: true });
    backdrop.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 120 : 320, easing: "ease-out" });
    if (reduce || !from) {
      frame.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
      return;
    }
    const dx = from.left - box.left;
    const dy = from.top - box.top;
    frame.current.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${from.width / box.width}, ${from.height / box.height})` },
        { transform: "none" },
      ],
      { duration: 620, easing: EASE },
    );
  }, [box, from, reduce]);

  // Die Vergrößerung bekommt einen eigenen Eintrag im Verlauf (nur einmal, auch im Strict Mode)
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    history.pushState({ [HISTORY_KEY]: true }, "");
  }, []);

  const close = useCallback(async () => {
    if (closing.current || !frame.current || !box) return;
    closing.current = true;
    const back = current === no ? findRect(current) : null;
    // Bedienung zuerst weg, damit nur die Tafel zurückfliegt
    for (const el of [controls.current, closeBtn.current]) {
      el?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "ease-out", fill: "forwards" });
    }
    const fade = backdrop.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: reduce ? 120 : 380,
      easing: "ease-out",
      fill: "forwards",
    });
    if (back && !reduce) {
      await frame.current.animate(
        [
          { transform: "none" },
          {
            transform: `translate(${back.left - box.left}px, ${back.top - box.top}px) scale(${back.width / box.width}, ${back.height / box.height})`,
          },
        ],
        { duration: 480, easing: EASE, fill: "forwards" },
      ).finished;
    } else {
      await frame.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-out", fill: "forwards" })
        .finished;
    }
    await fade?.finished;
    onClose(current);
  }, [box, current, findRect, no, onClose, reduce]);

  // Schließen per Knopf, Esc oder Klick: den eigenen Eintrag abräumen; das popstate darauf schließt dann.
  // So gibt es nur einen Weg zu, und die Zurück-Geste und der Knopf schließen nie doppelt.
  const requestClose = useCallback(() => {
    if (closing.current) return;
    if (isPlateEntry()) history.back();
    else close();
  }, [close]);
  useEffect(() => {
    const onPop = () => {
      if (!isPlateEntry()) close();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [close]);

  const n = book.plates.length;
  const step = useCallback(
    (d: number) => {
      setCurrent((c) => ((c - 1 + d + n) % n) + 1);
    },
    [n],
  );

  // Neues Bild beim Blättern im Vollbild: kurz einblenden statt springen
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    frame.current?.animate([{ opacity: 0, transform: "scale(0.985)" }, { opacity: 1, transform: "none" }], {
      duration: reduce ? 1 : 260,
      easing: EASE,
    });
  }, [current, reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") {
        // Fokus bleibt im Dialog
        const items = Array.from(
          document.querySelectorAll<HTMLButtonElement>("[data-viewer] button:not([disabled])"),
        );
        const i = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length];
        next?.focus();
      } else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [requestClose, step]);

  return (
    <div
      data-viewer
      role="dialog"
      aria-modal="true"
      aria-label={plateName(current, p.title)}
      // Zwei Finger zoomen ins Bild; die Bühne darunter blockiert Gesten (touch-none), die Vergrößerung nicht
      className="fixed inset-0 z-[500] touch-manipulation"
    >
      <div ref={backdrop} className="linen table-surface absolute inset-0 bg-table-deep" onClick={requestClose} />
      {box && (
        <>
          <div
            ref={frame}
            className="absolute origin-top-left overflow-hidden bg-paper will-change-transform"
            style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            onClick={requestClose}
          >
            {/* dieselbe Größe wie im Buch liegt schon im Cache: kein unscharfer Moment beim Öffnen */}
            <Image
              key={`small-${current}`}
              src={p.src}
              alt=""
              aria-hidden
              fill
              sizes="(min-width: 768px) 40vw, 96vw"
              className="object-cover"
            />
            <Image
              key={current}
              src={p.src}
              alt={p.alt}
              fill
              sizes="(min-width: 768px) 84vw, 94vw"
              quality={75}
              className="object-cover"
            />
          </div>
          <div
            ref={controls}
            className={`text-on-table-2 absolute flex gap-x-6 gap-y-1 text-sm ${box.side ? "flex-col items-start" : "flex-wrap items-baseline justify-between"}`}
            style={
              box.side
                ? { left: box.left + box.width + 16, width: box.side - 32, bottom: 12 }
                : { left: box.left, width: box.width, top: box.top + box.height + 14 }
            }
          >
            <p className="min-w-0">
              <span className="text-on-table font-semibold">{current}</span>
              {p.title && <span className="ml-2">{p.title}</span>}
              {p.note && <span className="ml-2">{p.note}</span>}
            </p>
            {/* „Zurück“ hieße hier zweierlei: zurück aus dem Buch oder zum vorigen Bild */}
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => step(-1)} aria-label={t("Voriges Bild")} title={t("Voriges Bild")} className={buttonClass("quiet", "icon")}>
                <ChevronLeft aria-hidden />
              </button>
              <button type="button" onClick={() => step(1)} aria-label={t("Nächstes Bild")} title={t("Nächstes Bild")} className={buttonClass("quiet", "icon")}>
                <ChevronRight aria-hidden />
              </button>
            </div>
          </div>
        </>
      )}
      <button
        ref={closeBtn}
        type="button"
        onClick={requestClose}
        aria-label={t("Schließen")}
        title={t("Schließen")}
        className={buttonClass("quiet", "icon", "absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 md:top-5 md:right-6")}
      >
        <X aria-hidden />
      </button>
    </div>
  );
}
