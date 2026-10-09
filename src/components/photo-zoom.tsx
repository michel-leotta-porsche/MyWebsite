"use client";

import { X } from "lucide-react";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { useT } from "@/lib/i18n";

const MAX = 6;
const DOUBLE = 2.5;

type Pt = { x: number; y: number };
type View = { s: number; x: number; y: number };

/** Ein Foto bildschirmfüllend: zwei Finger zoomen, ein Finger schiebt, Doppeltipp springt hinein und wieder heraus.
 *  Ein einfacher Tipp ohne Zoom schließt. Der Ausschnitt bleibt am Bild, es rutscht nicht ins Leere. */
export function PhotoZoom({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [view, setView] = useState<View>({ s: 1, x: 0, y: 0 });
  const [moving, setMoving] = useState(false);
  const pts = useRef(new Map<number, Pt>());
  const start = useRef<{ view: View; mid: Pt; d: number; moved: boolean } | null>(null);
  const lastTap = useRef<{ t: number; p: Pt } | null>(null);
  const tapTimer = useRef<number | undefined>(undefined);

  /** Mitte des Rahmens in Bildschirmkoordinaten */
  const center = (): Pt => {
    const r = box.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 };
  };
  /** Verschiebung so begrenzen, dass das vergrößerte Bild den Rahmen nicht freigibt */
  const clamp = (v: View): View => {
    const r = box.current?.getBoundingClientRect();
    const i = img.current;
    if (!r || !i) return v;
    const s = Math.min(MAX, Math.max(1, v.s));
    const mx = Math.max(0, (i.clientWidth * s - r.width) / 2);
    const my = Math.max(0, (i.clientHeight * s - r.height) / 2);
    return { s, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
  };
  /** um den Punkt p (Bildschirm) auf s zoomen: der Punkt unter dem Finger bleibt, wo er ist */
  const zoomAt = (from: View, s: number, p: Pt, shift: Pt = { x: 0, y: 0 }): View => {
    const c = center();
    const k = s / from.s;
    return clamp({ s, x: (p.x - c.x) * (1 - k) + from.x * k + shift.x, y: (p.y - c.y) * (1 - k) + from.y * k + shift.y });
  };

  const snapshot = (): { mid: Pt; d: number } => {
    const list = [...pts.current.values()];
    if (list.length < 2) return { mid: list[0] ?? { x: 0, y: 0 }, d: 1 };
    const [a, b] = list;
    return { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
  };

  const onDown = (e: ReactPointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    start.current = { view, ...snapshot(), moved: start.current?.moved ?? false };
    if (pts.current.size > 1) start.current.moved = true;
    setMoving(true);
  };
  const onMove = (e: ReactPointerEvent) => {
    if (!pts.current.has(e.pointerId) || !start.current) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const st = start.current;
    const now = snapshot();
    const shift = { x: now.mid.x - st.mid.x, y: now.mid.y - st.mid.y };
    if (Math.hypot(shift.x, shift.y) > 6) st.moved = true;
    if (pts.current.size > 1) setView(zoomAt(st.view, st.view.s * (now.d / st.d), st.mid, shift));
    else if (st.view.s > 1) setView(clamp({ s: st.view.s, x: st.view.x + shift.x, y: st.view.y + shift.y }));
  };
  const onUp = (e: ReactPointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.delete(e.pointerId);
    const st = start.current;
    if (pts.current.size > 0) {
      // ein Finger bleibt: von hier aus weiter schieben
      start.current = { view, ...snapshot(), moved: true };
      return;
    }
    setMoving(false);
    start.current = null;
    if (!st || st.moved) return;
    // Tipp: zweiter kurz danach zoomt hinein oder heraus, ein einzelner schließt (nur unvergrößert)
    const p = { x: e.clientX, y: e.clientY };
    const prev = lastTap.current;
    if (prev && Date.now() - prev.t < 300 && Math.hypot(p.x - prev.p.x, p.y - prev.p.y) < 40) {
      window.clearTimeout(tapTimer.current);
      lastTap.current = null;
      setView(view.s > 1.05 ? { s: 1, x: 0, y: 0 } : zoomAt(view, DOUBLE, p));
      return;
    }
    lastTap.current = { t: Date.now(), p };
    if (view.s <= 1.05) tapTimer.current = window.setTimeout(onClose, 300);
  };

  return (
    <div className="fixed inset-0 z-10 bg-black" role="dialog" aria-label={alt}>
      <div
        ref={box}
        className="absolute inset-0 grid touch-none place-items-center overflow-hidden"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Blob vom Gerät */}
        <img
          ref={img}
          src={src}
          alt={alt}
          draggable={false}
          className={`max-h-full max-w-full object-contain will-change-transform ${moving ? "" : "transition-transform duration-200 ease-out"}`}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}
        />
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("Zurück zur Kamera")}
        className="bg-table-deep/80 text-on-table absolute grid h-10 w-10 place-items-center rounded-full"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)", right: 16 }}
      >
        <X aria-hidden className="h-5 w-5" />
      </button>
    </div>
  );
}
