"use client";

// Gradationskurve: Punkte ziehen, auf die Fläche tippen setzt einen neuen, aus der Fläche ziehen oder Doppelklick
// nimmt ihn weg. Mit der Tastatur: Tab zum Punkt, Pfeiltasten verschieben, Entf löscht.

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { CURVE_GAP, curveFn } from "@/lib/develop/model";
import { useT } from "@/lib/i18n";

type Pt = [number, number];
const LINE: Pt[] = [
  [0, 0],
  [1, 1],
];
const MAX = 8;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pct = (v: number) => Math.round(v * 100);

export function CurvePad({ points, hist, onStart, onChange }: { points: Pt[]; hist?: number[]; onStart: () => void; onChange: (p: Pt[]) => void }) {
  // beim Ziehen gilt die eigene Liste: liegt ein Punkt zufällig auf der Diagonalen, darf er nicht verschwinden
  const [local, setLocal] = useState<Pt[] | null>(null);
  const pts = local ?? (points.length >= 2 ? points : LINE);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ i: number; out: boolean; list: Pt[] } | null>(null);
  const [out, setOut] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const t = useT();

  const path = useMemo(() => {
    const f = curveFn(pts);
    return Array.from({ length: 101 }, (_, i) => `${i ? "L" : "M"}${i},${(100 - f(i / 100) * 100).toFixed(2)}`).join("");
  }, [pts]);
  const histPath = useMemo(() => {
    if (!hist?.length) return null;
    const mx = Math.max(...hist) || 1;
    const n = hist.length;
    return `M0,100 ${hist.map((v, i) => `L${((i + 0.5) / n) * 100},${(100 - Math.sqrt(v / mx) * 70).toFixed(2)}`).join(" ")} L100,100 Z`;
  }, [hist]);

  const at = (e: PointerEvent): Pt => {
    const r = svg.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
  };
  /** Punkt i auf (x, y) setzen, zwischen seinen Nachbarn; die Enden bleiben bei 0 und 1 */
  const moved = (list: Pt[], i: number, [x, y]: Pt): Pt[] => {
    const next = list.map((p) => [...p] as Pt);
    const end = i === 0 || i === list.length - 1;
    next[i] = [end ? list[i][0] : clamp(x, list[i - 1][0] + CURVE_GAP, list[i + 1][0] - CURVE_GAP), clamp(y, 0, 1)];
    return next;
  };
  const without = (list: Pt[], i: number) => list.filter((_, j) => j !== i);
  const tidy = (list: Pt[]) => (list.every(([x, y]) => Math.abs(x - y) < 0.002) ? [] : list);

  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const [x, y] = at(e);
    const r = svg.current!.getBoundingClientRect();
    // nächster Punkt in Fingerreichweite (in Pixeln gemessen)
    let best = -1;
    let bd = (e.pointerType === "touch" ? 24 : 14) / r.width;
    pts.forEach(([px, py], i) => {
      const d = Math.hypot(px - x, (py - y) * (r.height / r.width));
      if (d < bd) [best, bd] = [i, d];
    });
    e.currentTarget.setPointerCapture(e.pointerId);
    onStart();
    if (best >= 0) {
      drag.current = { i: best, out: false, list: pts };
      setLocal(pts);
      return;
    }
    if (pts.length >= MAX) return;
    const i = pts.findIndex(([px]) => px > x);
    if (i <= 0 || x - pts[i - 1][0] < CURVE_GAP || pts[i][0] - x < CURVE_GAP) return;
    const next: Pt[] = [...pts.slice(0, i), [x, clamp(y, 0, 1)], ...pts.slice(i)];
    drag.current = { i, out: false, list: next };
    setLocal(next);
    onChange(tidy(next));
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = at(e);
    const end = d.i === 0 || d.i === d.list.length - 1;
    // weit aus der Fläche gezogen: der Punkt fällt beim Loslassen weg
    const gone = !end && (y < -0.12 || y > 1.12 || x < -0.12 || x > 1.12);
    if (gone !== d.out) {
      d.out = gone;
      setOut(gone ? d.i : null);
    }
    if (gone) return;
    d.list = moved(d.list, d.i, [x, y]);
    setLocal(d.list);
    onChange(tidy(d.list));
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    setOut(null);
    setLocal(null);
    if (d?.out) onChange(tidy(without(d.list, d.i)));
  };
  const key = (e: KeyboardEvent, i: number) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const [x, y] = pts[i];
    const to: Partial<Record<string, Pt>> = {
      ArrowUp: [x, y + step],
      ArrowDown: [x, y - step],
      ArrowLeft: [x - step, y],
      ArrowRight: [x + step, y],
    };
    if (to[e.key]) {
      e.preventDefault();
      onStart();
      onChange(tidy(moved(pts, i, to[e.key]!)));
    } else if ((e.key === "Delete" || e.key === "Backspace") && i > 0 && i < pts.length - 1) {
      e.preventDefault();
      onStart();
      onChange(tidy(without(pts, i)));
    }
  };

  return (
    <svg
      ref={svg}
      viewBox="-3 -3 106 106"
      role="group"
      aria-label={t("Gradationskurve")}
      className="bg-ink/4 aspect-square w-full max-w-[300px] cursor-crosshair touch-none rounded-[6px] shadow-[inset_0_0_0_1px_rgb(27_28_26/0.12)] select-none"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onDoubleClick={(e) => {
        const [x, y] = at(e as unknown as PointerEvent);
        const i = pts.findIndex(([px, py], j) => j > 0 && j < pts.length - 1 && Math.hypot(px - x, py - y) < 0.05);
        if (i < 0) return;
        onStart();
        onChange(tidy(without(pts, i)));
      }}
    >
      {histPath && <path d={histPath} className="fill-ink/8" />}
      {[25, 50, 75].map((v) => (
        <g key={v} className="stroke-ink/10" strokeWidth={1} vectorEffect="non-scaling-stroke">
          <line x1={v} y1={0} x2={v} y2={100} vectorEffect="non-scaling-stroke" />
          <line x1={0} y1={v} x2={100} y2={v} vectorEffect="non-scaling-stroke" />
        </g>
      ))}
      <line x1={0} y1={100} x2={100} y2={0} className="stroke-ink/25" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      <path d={path} fill="none" className="stroke-ink" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      {pts.map(([x, y], i) => (
        <circle
          key={i}
          cx={x * 100}
          cy={100 - y * 100}
          r={focus === i ? 3.6 : 2.8}
          tabIndex={0}
          role="slider"
          aria-label={i === 0 ? t("Schwarzpunkt") : i === pts.length - 1 ? t("Weißpunkt") : t("Punkt {i} von {n}", { i, n: pts.length - 2 })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct(y)}
          aria-valuetext={t("Eingang {x}, Ausgang {y}", { x: pct(x), y: pct(y) })}
          onFocus={() => setFocus(i)}
          onBlur={() => setFocus(null)}
          onKeyDown={(e) => key(e, i)}
          className={`fill-paper stroke-ink outline-none ${out === i ? "opacity-30" : ""} ${focus === i ? "stroke-mark" : ""}`}
          strokeWidth={focus === i ? 2.5 : 1.75}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
