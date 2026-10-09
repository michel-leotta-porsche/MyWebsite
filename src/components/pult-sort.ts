"use client";

import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { haptic } from "@/lib/haptics";

// Abzüge auf dem Pult umsortieren: kurz halten (Finger) oder gleich ziehen (Maus), dann folgt der Abzug der Hand und die
// anderen rücken zur Seite. Wer ihn weit vom Pult wegzieht, spürt Widerstand; losgelassen fliegt er an seinen alten Platz
// zurück. Die Abzüge sind <li data-pile="…"> in der Liste, an die `bind` gehängt wird. Alles läuft über die CSS-Eigenschaft
// translate am Element, damit beim Ziehen nichts neu rendert; nur die Reihenfolge ist Zustand.

/** so lange hält der Finger still, bevor sich ein Abzug hebt; kürzer wird es zum Tippen, länger fühlt es sich träge an */
const HOLD = 320;
/** so weit darf der Finger in der Haltezeit wandern, sonst ist es Scrollen */
const SLOP = 8;
/** Abstand um das Pult, ab dem ein Abzug als weggezogen gilt */
const AWAY = 48;

type Drag = {
  key: string;
  pointer: number;
  li: HTMLElement;
  x: number;
  y: number;
  /** Pointer gerade */
  px: number;
  py: number;
  /** Platz in der Liste beim Anheben (offsetLeft/Top ignoriert translate und rotate) */
  ox: number;
  oy: number;
  /** Mitte jedes Platzes beim Anheben, für die Wahl des neuen Platzes */
  slots: { key: string; cx: number; cy: number }[];
  start: string[];
  live: boolean;
  away: boolean;
  timer: number;
};

const offset = (el: HTMLElement) => [el.offsetLeft, el.offsetTop] as const;
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function usePultSort({ keys, onDrop }: { keys: string[]; onDrop: (keys: string[]) => void }) {
  const list = useRef<HTMLUListElement>(null);
  const drag = useRef<Drag | null>(null);
  // nach dem Ziehen kein Klick, der den Abzug öffnet
  const swallow = useRef(false);
  const [order, setOrder] = useState<string[] | null>(null);
  // Plätze vor dem Neusortieren, für das Nachrücken der anderen (FLIP)
  const before = useRef<Map<string, readonly [number, number]> | null>(null);
  // der eben losgelassene Abzug gleitet selbst an seinen Platz (settle), nicht über das Nachrücken
  const landing = useRef<string | null>(null);

  const items = () => [...(list.current?.querySelectorAll<HTMLElement>("li[data-pile]") ?? [])];

  const place = (d: Drag) => {
    const [nx, ny] = offset(d.li);
    let dx = d.px - d.x - (nx - d.ox);
    let dy = d.py - d.y - (ny - d.oy);
    if (d.away) {
      // außerhalb des Pults gebremst, wie an einem Gummiband
      const [hx, hy] = [d.px - d.x, d.py - d.y];
      dx -= hx * 0.45;
      dy -= hy * 0.45;
    }
    d.li.style.translate = `${dx}px ${dy}px`;
  };

  // nach jedem Neusortieren: der gezogene Abzug bleibt unter dem Finger, die anderen gleiten an ihren neuen Platz
  useLayoutEffect(() => {
    const d = drag.current;
    if (d?.live) place(d);
    const prev = before.current;
    before.current = null;
    if (!prev || still()) return;
    for (const el of items()) {
      const k = el.dataset.pile!;
      if (k === d?.key || k === landing.current) continue;
      const was = prev.get(k);
      if (!was) continue;
      const [x, y] = offset(el);
      if (was[0] === x && was[1] === y) continue;
      el.animate([{ translate: `${was[0] - x}px ${was[1] - y}px` }, { translate: "0 0" }], { duration: 260, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)" });
    }
  });

  const remember = () => (before.current = new Map(items().map((el) => [el.dataset.pile!, offset(el)])));

  const lift = (d: Drag) => {
    d.live = true;
    const r = list.current!.getBoundingClientRect();
    d.slots = items().map((el) => {
      const b = el.getBoundingClientRect();
      return { key: el.dataset.pile!, cx: b.left + b.width / 2 - r.left, cy: b.top + b.height / 2 - r.top };
    });
    // umgehängte Elemente spielten sonst das Austeilen (.deal) noch einmal ab
    list.current!.dataset.sorted = "";
    d.li.dataset.drag = "";
    d.li.dataset.lift = "";
    haptic("select");
  };

  const settle = (d: Drag) => {
    const el = d.li;
    const from = getComputedStyle(el).translate;
    delete el.dataset.drag;
    delete el.dataset.lift;
    el.style.translate = "";
    if (still() || !from || from === "none") return void (landing.current = null);
    // erst nach dem Neusortieren messen: die Lücke kann woanders liegen als beim Loslassen
    const [fx, fy] = from.split(" ").map((v) => parseFloat(v) || 0);
    const [ax, ay] = offset(el);
    requestAnimationFrame(() => {
      const [bx, by] = offset(el);
      landing.current = null;
      el.animate([{ translate: `${fx + ax - bx}px ${fy + ay - by}px` }, { translate: "0 0" }], { duration: d.away ? 520 : 360, easing: "cubic-bezier(0.25, 1.35, 0.4, 1)" });
    });
  };

  const end = (drop: boolean) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    clearTimeout(d.timer);
    if (!d.live) return;
    swallow.current = true;
    setTimeout(() => (swallow.current = false), 400);
    landing.current = d.key;
    const next = order ?? d.start;
    remember();
    settle(d);
    setOrder(null);
    if (drop && !d.away && next.join() !== d.start.join()) {
      haptic("select");
      onDrop(next);
    }
  };

  const bind = {
    ref: list,
    onPointerDown: (e: ReactPointerEvent<HTMLUListElement>) => {
      if (drag.current || e.button !== 0) return;
      const li = (e.target as Element).closest<HTMLElement>("li[data-pile]");
      if (!li || !list.current?.contains(li)) return;
      const [ox, oy] = offset(li);
      const d: Drag = { key: li.dataset.pile!, pointer: e.pointerId, li, x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY, ox, oy, slots: [], start: keys, live: false, away: false, timer: 0 };
      drag.current = d;
      // Finger: erst halten, sonst bleibt das Pult scrollbar. Maus: sofort, sobald sie sich bewegt
      if (e.pointerType !== "mouse")
        d.timer = window.setTimeout(() => {
          if (drag.current !== d) return;
          lift(d);
          li.setPointerCapture?.(d.pointer);
        }, HOLD);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLUListElement>) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointer) return;
      d.px = e.clientX;
      d.py = e.clientY;
      if (!d.live) {
        if (Math.hypot(d.px - d.x, d.py - d.y) <= SLOP) return;
        if (e.pointerType !== "mouse") return void end(false);
        lift(d);
        d.li.setPointerCapture?.(d.pointer);
      }
      const r = list.current!.getBoundingClientRect();
      const away = d.px < r.left - AWAY || d.px > r.right + AWAY || d.py < r.top - AWAY || d.py > r.bottom + AWAY;
      const cur = order ?? d.start;
      let next = d.start;
      if (!away) {
        // der nächste Platz zum Finger, gemessen an den Plätzen beim Anheben
        const lx = d.px - r.left;
        const ly = d.py - r.top;
        const near = d.slots.reduce((a, s) => (Math.hypot(s.cx - lx, s.cy - ly) < Math.hypot(a.cx - lx, a.cy - ly) ? s : a), d.slots[0]);
        const to = d.start.indexOf(near.key);
        next = d.start.filter((k) => k !== d.key);
        next.splice(to, 0, d.key);
      }
      if (away !== d.away) haptic("select");
      d.away = away;
      if (next.join() !== cur.join()) {
        remember();
        setOrder(next);
      } else place(d);
    },
    onPointerUp: (e: ReactPointerEvent<HTMLUListElement>) => {
      if (drag.current && e.pointerId === drag.current.pointer) end(true);
    },
    onPointerCancel: () => end(false),
    // Kontextmenü (iOS-Lupe, Rechtsklick) beim Halten unterdrücken
    onContextMenu: (e: ReactPointerEvent<HTMLUListElement> | React.MouseEvent<HTMLUListElement>) => {
      if (drag.current) e.preventDefault();
    },
    onClickCapture: (e: React.MouseEvent<HTMLUListElement>) => {
      if (!swallow.current) return;
      e.preventDefault();
      e.stopPropagation();
    },
  };

  // solange ein Abzug gehalten wird, scrollt die Seite nicht mit (das geht nur mit einem nicht-passiven Zuhörer)
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const stop = (e: TouchEvent) => drag.current?.live && e.cancelable && e.preventDefault();
    el.addEventListener("touchmove", stop, { passive: false });
    return () => el.removeEventListener("touchmove", stop);
  }, []);

  return { order, bind };
}
