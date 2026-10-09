"use client";

import { useRef, useState, type CSSProperties } from "react";

import { FlipHorizontal2, RotateCcwSquare } from "lucide-react";

import { IconButton } from "@/components/ui/button";
import { cropFits, toward, type Geo } from "@/lib/develop/geo";
import { haptic } from "@/lib/haptics";

// Zuschneiden im Editor (Workshop editor-werkzeuge-workshop/, Paket 1): ein Rahmen über dem ganzen Foto und ein Drehrad
// darunter. Der Rahmen liegt in Bruchteilen der Fläche; was nicht mehr ins gedrehte Bild passt, wird nicht angenommen,
// so gibt es keine leeren Ecken.

type Crop = Geo["crop"];
type Handle = "move" | "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

const MIN = 0.08;
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Neuer Rahmen beim Ziehen an einem Griff; k ist das feste Seitenverhältnis in Pixeln (null: frei) */
function dragTo(h: Handle, c: Crop, dx: number, dy: number, k: number | null, W: number, H: number): Crop {
  let [x, y, w, hh] = c;
  if (h === "move") return [clamp(x + dx, 0, 1 - w), clamp(y + dy, 0, 1 - hh), w, hh];
  const left = h.includes("w");
  const right = h.includes("e");
  const top = h.includes("n");
  const bottom = h.includes("s");
  // Gegenseite bleibt stehen
  const x2 = x + w;
  const y2 = y + hh;
  if (left) x = clamp(x + dx, 0, x2 - MIN);
  if (right) w = clamp(w + dx, MIN, 1 - x);
  if (left) w = x2 - x;
  if (top) y = clamp(y + dy, 0, y2 - MIN);
  if (bottom) hh = clamp(hh + dy, MIN, 1 - y);
  if (top) hh = y2 - y;
  if (k !== null) {
    // Seitenverhältnis halten: an einer Ecke gewinnt die größere Änderung, an einer Kante wächst die andere Seite mittig mit
    const wFromH = (hh * H * k) / W;
    const hFromW = (w * W) / k / H;
    const corner = (left || right) && (top || bottom);
    if (corner ? wFromH > w : top || bottom) w = wFromH;
    else hh = hFromW;
    if (corner) {
      if (left) x = x2 - w;
      if (top) y = y2 - hh;
    } else if (top || bottom) x = c[0] + c[2] / 2 - w / 2;
    else y = c[1] + c[3] / 2 - hh / 2;
  }
  return [x, y, w, hh];
}

export function CropStage({ geo, W, H, ratio, onChange, onEnd }: { geo: Geo; W: number; H: number; ratio: number | null; onChange: (c: Crop) => void; onEnd: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ h: Handle; x: number; y: number; from: Crop } | null>(null);
  const [active, setActive] = useState(false);
  const [x, y, w, h] = geo.crop;

  const down = (e: React.PointerEvent<HTMLElement>, hd: Handle) => {
    e.stopPropagation();
    e.preventDefault();
    box.current?.setPointerCapture(e.pointerId);
    drag.current = { h: hd, x: e.clientX, y: e.clientY, from: geo.crop };
    setActive(true);
  };
  const move = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    const r = box.current?.getBoundingClientRect();
    if (!d || !r) return;
    const next = dragTo(d.h, d.from, (e.clientX - d.x) / r.width, (e.clientY - d.y) / r.height, ratio, W, H);
    // nur so weit, wie der Rahmen im gedrehten Bild bleibt
    const ok = cropFits(d.from, geo.angle, W, H) ? toward(d.from, next, geo.angle, W, H) : next;
    onChange(ok);
  };
  const up = () => {
    if (!drag.current) return;
    drag.current = null;
    setActive(false);
    onEnd();
  };

  // Pfeiltasten auf dem Rahmen verschieben ihn, mit Umschalt weiter
  const key = (e: React.KeyboardEvent, hd: Handle) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const d = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, [number, number]>)[e.key];
    if (!d) return;
    e.preventDefault();
    onChange(toward(geo.crop, dragTo(hd, geo.crop, d[0], d[1], ratio, W, H), geo.angle, W, H));
    onEnd();
  };

  const pos = (hd: Handle): CSSProperties => ({
    left: hd.includes("w") ? 0 : hd.includes("e") ? "100%" : "50%",
    top: hd.includes("n") ? 0 : hd.includes("s") ? "100%" : "50%",
  });

  return (
    <div
      ref={box}
      className="absolute inset-0 z-[7] touch-none select-none"
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        role="group"
        aria-label="Rahmen. Ziehen verschiebt, Ecken ändern die Größe. Pfeiltasten verschieben."
        tabIndex={0}
        onKeyDown={(e) => key(e, "move")}
        onPointerDown={(e) => down(e, "move")}
        className="absolute cursor-move outline-[max(100vw,100vh)] outline-[rgb(12_10_8/0.62)] outline-solid focus-visible:outline-[rgb(12_10_8/0.62)]"
        style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}
      >
        <span aria-hidden className="border-on-table/80 pointer-events-none absolute inset-0 border" />
        {/* Drittel nur beim Ziehen */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 transition-opacity duration-150 ${active ? "opacity-100" : "opacity-0"}`}
          style={{
            backgroundImage:
              "linear-gradient(to right, transparent calc(33.333% - 0.5px), rgb(236 230 220 / 0.55) calc(33.333% - 0.5px), rgb(236 230 220 / 0.55) calc(33.333% + 0.5px), transparent calc(33.333% + 0.5px), transparent calc(66.667% - 0.5px), rgb(236 230 220 / 0.55) calc(66.667% - 0.5px), rgb(236 230 220 / 0.55) calc(66.667% + 0.5px), transparent calc(66.667% + 0.5px)), linear-gradient(to bottom, transparent calc(33.333% - 0.5px), rgb(236 230 220 / 0.55) calc(33.333% - 0.5px), rgb(236 230 220 / 0.55) calc(33.333% + 0.5px), transparent calc(33.333% + 0.5px), transparent calc(66.667% - 0.5px), rgb(236 230 220 / 0.55) calc(66.667% - 0.5px), rgb(236 230 220 / 0.55) calc(66.667% + 0.5px), transparent calc(66.667% + 0.5px))",
          }}
        />
        {HANDLES.map((hd) => {
          const corner = hd.length === 2;
          return (
            <span
              key={hd}
              aria-hidden
              onPointerDown={(e) => down(e, hd)}
              className={`absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center ${hd === "n" || hd === "s" ? "cursor-ns-resize" : hd === "e" || hd === "w" ? "cursor-ew-resize" : hd === "nw" || hd === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"}`}
              style={pos(hd)}
            >
              {corner ? (
                <span
                  className="border-on-table block size-[22px]"
                  style={{
                    borderStyle: "solid",
                    borderWidth: `${hd.includes("n") ? 3 : 0}px ${hd.includes("e") ? 3 : 0}px ${hd.includes("s") ? 3 : 0}px ${hd.includes("w") ? 3 : 0}px`,
                    translate: `${hd.includes("w") ? 9.5 : -9.5}px ${hd.includes("n") ? 9.5 : -9.5}px`,
                  }}
                />
              ) : (
                <span className={`bg-on-table block ${hd === "n" || hd === "s" ? "h-[3px] w-[22px]" : "h-[22px] w-[3px]"}`} />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const PX = 7; // Abstand der Striche je Grad

/**
 * Drehrad zum Geraderichten: die Skala läuft unter der festen gelben Marke, ziehen ist relativ (wie ein Rad), nicht absolut.
 * Tastatur und VoiceOver nehmen den unsichtbaren Regler darin. Bei 0 rastet es ein.
 */
export function StraightenDial({
  angle,
  onStart,
  onChange,
  onEnd,
  onTurn,
  onFlip,
}: {
  angle: number;
  onStart: () => void;
  onChange: (a: number) => void;
  onEnd: () => void;
  onTurn: () => void;
  onFlip: () => void;
}) {
  const drag = useRef<{ x: number; from: number; snapped: boolean } | null>(null);
  const snap = (a: number) => (Math.abs(a) < 0.6 ? 0 : Math.round(a * 10) / 10);
  const set = (a: number) => {
    const v = snap(clamp(a, -45, 45));
    const d = drag.current;
    if (d && (v === 0) !== d.snapped) {
      d.snapped = v === 0;
      if (v === 0) haptic("select");
    }
    onChange(v);
  };
  const label = `${angle > 0 ? "+" : angle < 0 ? "−" : ""}${Math.abs(angle).toFixed(1).replace(".", ",")}°`;
  return (
    <div className="flex items-center justify-center gap-2">
      <IconButton label="90° nach links drehen" onClick={onTurn}>
        <RotateCcwSquare aria-hidden />
      </IconButton>
      <div className="relative w-[min(62vw,300px)] focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-[var(--color-mark)]">
        <output aria-hidden className={`block text-center text-xs font-semibold tabular-nums ${angle ? "text-on-table" : "text-on-table-2"}`}>
          {label}
        </output>
        <div
          data-dial=""
          className="relative mt-1 h-9 cursor-ew-resize touch-none overflow-hidden select-none [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)]"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, from: angle, snapped: angle === 0 };
            onStart();
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d) set(d.from - (e.clientX - d.x) / PX);
          }}
          onPointerUp={() => {
            if (!drag.current) return;
            drag.current = null;
            onEnd();
          }}
          onPointerCancel={() => {
            drag.current = null;
            onEnd();
          }}
          onDoubleClick={() => {
            onStart();
            onChange(0);
            onEnd();
          }}
        >
          <div aria-hidden className="absolute top-1 left-1/2 h-7" style={{ transform: `translateX(${-angle * PX}px)` }}>
            {Array.from({ length: 91 }, (_, i) => {
              const deg = i - 45;
              const major = deg % 5 === 0;
              return (
                <span
                  key={deg}
                  className={`absolute top-0 w-px ${major ? "bg-on-table/70 h-4" : "bg-on-table/35 h-2.5"}`}
                  style={{ left: `${deg * PX}px` }}
                />
              );
            })}
          </div>
          <span aria-hidden className="bg-mark absolute top-0 left-1/2 h-6 w-0.5 -translate-x-1/2" />
          <span aria-hidden className="bg-on-table/60 absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full" />
        </div>
        <input
          type="range"
          min={-45}
          max={45}
          step={0.1}
          value={angle}
          aria-label="Geraderichten"
          aria-valuetext={label}
          onFocus={onStart}
          onBlur={onEnd}
          onChange={(e) => set(Number(e.target.value))}
          className="sr-only"
        />
      </div>
      <IconButton label="Spiegeln" onClick={onFlip}>
        <FlipHorizontal2 aria-hidden />
      </IconButton>
    </div>
  );
}
