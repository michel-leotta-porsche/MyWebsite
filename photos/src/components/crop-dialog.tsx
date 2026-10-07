"use client";

import { useEffect, useRef, useState } from "react";

import { SlipDialog } from "@/components/app-ui";
import type { StoredPhoto } from "@/lib/store";
import { findSubject } from "@/lib/subject";

// Ausschnitt eines Fotos im Bildfeld: ziehen verschiebt, der Regler zoomt, „ganz zeigen“ verzichtet auf Beschnitt.
// Dieselbe Rechnung wie Seite und Textur: Bildlage links = Fokus × (Feldbreite − Bildbreite × Zoom).

type View = { focus: [number, number]; zoom: number; fit: "cover" | "contain" };

export function CropDialog({
  photo,
  aspect,
  gutter,
  onChange,
  onClose,
}: {
  photo: StoredPhoto;
  /** Breite durch Höhe des Bildfelds im gewählten Layout */
  aspect: number;
  /** das Feld läuft über den Bund: Mitte ist der Falz */
  gutter: boolean;
  onChange: (v: View) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>({ focus: photo.focus ?? [0.5, 0.5], zoom: photo.zoom ?? 1, fit: photo.fit ?? "cover" });
  const [subject, setSubject] = useState<[number, number] | null>(photo.subject ?? null);
  const [face, setFace] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; f: [number, number] } | null>(null);

  // ältere Fotos ohne gespeichertes Motiv: jetzt aus dem kleinen Abzug schätzen
  useEffect(() => {
    if (subject) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () =>
      findSubject(img)
        .then((r) => {
          setSubject(r.point);
          setFace(r.face);
        })
        .catch(() => {});
    img.src = photo.thumb;
  }, [photo.thumb, subject]);

  // ganz zeigen, auch bei einem Bild über beide Seiten: so breit, wie der Bildschirm erlaubt
  const wide = aspect > 1.15;
  const vw = typeof window === "undefined" ? 1024 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const room = Math.min(wide ? 728 : 408, vw - 64);
  const FW = Math.min(room, 420 * aspect, vh * 0.55 * aspect);
  const FH = FW / aspect;
  // Bild füllt das Feld (cover), dann Zoom; Lage über den Fokus
  const s = Math.max(FW / photo.w, FH / photo.h);
  const W = photo.w * s * view.zoom;
  const H = photo.h * s * view.zoom;
  const left = view.fit === "contain" ? (FW - photo.w * Math.min(FW / photo.w, FH / photo.h)) / 2 : view.focus[0] * (FW - W);
  const top = view.fit === "contain" ? (FH - photo.h * Math.min(FW / photo.w, FH / photo.h)) / 2 : view.focus[1] * (FH - H);
  const shownW = view.fit === "contain" ? photo.w * Math.min(FW / photo.w, FH / photo.h) : W;
  const shownH = view.fit === "contain" ? photo.h * Math.min(FW / photo.w, FH / photo.h) : H;

  const set = (v: View) => {
    setView(v);
    onChange(v);
  };
  const clamp = (v: number) => Math.min(1, Math.max(0, v));

  // Warnungen: Motiv angeschnitten oder im Falz
  let warning: string | null = null;
  if (subject && view.fit === "cover") {
    const sx = left + subject[0] * W;
    const sy = top + subject[1] * H;
    const m = 0.08;
    if (sx < FW * m || sx > FW * (1 - m) || sy < FH * m || sy > FH * (1 - m))
      warning = face ? "Das Gesicht ist angeschnitten." : "Das Hauptmotiv liegt am Rand oder ist angeschnitten.";
    else if (gutter && Math.abs(sx / FW - 0.5) < 0.05) warning = face ? "Das Gesicht liegt im Falz." : "Das Hauptmotiv liegt im Falz.";
  }

  const centerOnSubject = () => {
    if (!subject) return;
    // Motiv in die Mitte (bei einem Bild über den Bund auf ein Drittel, nie in den Falz)
    const tx = gutter ? (subject[0] < 0.5 ? 0.3 : 0.7) : 0.5;
    const fx = W === FW ? 0.5 : clamp((tx * FW - subject[0] * W) / (FW - W));
    const fy = H === FH ? 0.5 : clamp((0.45 * FH - subject[1] * H) / (FH - H));
    set({ ...view, fit: "cover", focus: [fx, fy] });
  };

  return (
    <SlipDialog label="Ausschnitt" onClose={onClose} wide={wide}>
      <div
        ref={frame}
        className="relative mx-auto touch-none overflow-hidden bg-paper select-none"
        style={{ width: FW, height: FH, cursor: view.fit === "cover" ? "grab" : "default" }}
        onPointerDown={(e) => {
          if (view.fit !== "cover") return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, f: view.focus };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const fx = W === FW ? d.f[0] : clamp(d.f[0] + (e.clientX - d.x) / (FW - W));
          const fy = H === FH ? d.f[1] : clamp(d.f[1] + (e.clientY - d.y) / (FH - H));
          set({ ...view, focus: [fx, fy] });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- exakte Lage wie im Buch, ohne next/image */}
        <img
          src={photo.src}
          alt={photo.alt || "Foto"}
          draggable={false}
          className="pointer-events-none absolute max-w-none"
          style={{ left, top, width: shownW, height: shownH }}
        />
        {gutter && <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-[rgb(12_10_8/0.35)]" />}
        {subject && (
          <span
            aria-hidden
            className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 border-2 border-paper bg-mark"
            style={{ left: left + subject[0] * shownW, top: top + subject[1] * shownH, borderRadius: 9999 }}
          />
        )}
      </div>

      <p className={`mt-3 min-h-5 text-[13px] ${warning ? "text-ink font-semibold" : "text-ink-2"}`} role={warning ? "alert" : undefined}>
        {warning ?? (subject ? `Punkt: ${face ? "erkanntes Gesicht" : "geschätztes Hauptmotiv"}. Ziehen verschiebt den Ausschnitt.` : "Ziehen verschiebt den Ausschnitt.")}
      </p>

      <label className="mt-4 block text-[13px]">
        <span className="text-ink-2">Zoom {view.zoom.toFixed(1)}×</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={view.zoom}
          disabled={view.fit === "contain"}
          onChange={(e) => set({ ...view, zoom: Number(e.target.value) })}
          className="block w-full accent-[var(--ink)]"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <button type="button" onClick={centerOnSubject} disabled={!subject} className="underline decoration-mark decoration-2 underline-offset-4 disabled:opacity-50">
          Motiv in die Mitte
        </button>
        <button
          type="button"
          aria-pressed={view.fit === "contain"}
          onClick={() => set({ ...view, fit: view.fit === "contain" ? "cover" : "contain" })}
          className="underline decoration-mark decoration-2 underline-offset-4"
        >
          {view.fit === "contain" ? "Feld füllen" : "Ganzes Foto zeigen"}
        </button>
        <button type="button" onClick={() => set({ focus: [0.5, 0.5], zoom: 1, fit: "cover" })} className="text-ink-2 underline underline-offset-4">
          Zurücksetzen
        </button>
      </div>
    </SlipDialog>
  );
}
