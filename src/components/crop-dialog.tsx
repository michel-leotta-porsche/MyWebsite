"use client";

import { useEffect, useRef, useState } from "react";

import { Crosshair, Maximize2, RotateCcw, Scan } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MountedSheet } from "@/components/ui/sheet";
import { useT } from "@/lib/i18n";
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
  const t = useT();
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
      warning = face ? t("Das Gesicht ist angeschnitten.") : t("Das Hauptmotiv liegt am Rand oder ist angeschnitten.");
    else if (gutter && Math.abs(sx / FW - 0.5) < 0.05) warning = face ? t("Das Gesicht liegt im Falz.") : t("Das Hauptmotiv liegt im Falz.");
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
    <MountedSheet
      title={t("Ausschnitt")}
      wide={wide}
      onClose={onClose}
    >
      {/* Band über die ganze Zettelbreite: was außerhalb des Felds liegt, bleibt blass sichtbar (UX-Kritik K7) */}
      <div className="relative -mx-5 overflow-hidden bg-paper-shade py-4">
        <div className="relative mx-auto" style={{ width: FW, height: FH }}>
          {view.fit === "cover" && (
            // eslint-disable-next-line @next/next/no-img-element -- dieselbe Lage wie das Bild im Feld
            <img
              src={photo.src}
              alt=""
              aria-hidden
              draggable={false}
              className="pointer-events-none absolute max-w-none opacity-30"
              style={{ left, top, width: shownW, height: shownH }}
            />
          )}
          <div
            ref={frame}
            role="group"
            // Ziehen verschiebt den Ausschnitt, nicht das Blatt
            data-base-ui-swipe-ignore
            tabIndex={view.fit === "cover" ? 0 : -1}
            aria-label={t("Ausschnitt verschieben: Pfeiltasten, mit Umschalt in großen Schritten")}
            className="absolute inset-0 touch-none overflow-hidden bg-paper outline-offset-4 select-none"
            style={{ cursor: view.fit === "cover" ? "grab" : "default" }}
            onKeyDown={(e) => {
              if (view.fit !== "cover") return;
              const step = e.shiftKey ? 32 : 8;
              const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
              const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
              if (!dx && !dy) return;
              e.preventDefault();
              // wie Ziehen um dx/dy Pixel
              const fx = W === FW ? view.focus[0] : clamp(view.focus[0] + dx / (FW - W));
              const fy = H === FH ? view.focus[1] : clamp(view.focus[1] + dy / (FH - H));
              set({ ...view, focus: [fx, fy] });
            }}
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
              alt={photo.alt || t("Foto")}
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
        </div>
      </div>

      <p className={`mt-3 min-h-5 text-[13px] ${warning ? "text-ink font-semibold" : "text-ink-2"}`} role={warning ? "alert" : undefined}>
        {warning ??
          (subject
            ? face
              ? t("Punkt: erkanntes Gesicht. Ziehen oder Pfeiltasten verschieben den Ausschnitt.")
              : t("Punkt: geschätztes Hauptmotiv. Ziehen oder Pfeiltasten verschieben den Ausschnitt.")
            : t("Ziehen oder Pfeiltasten verschieben den Ausschnitt."))}
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
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="paper" size="sm" onClick={centerOnSubject} disabled={!subject}>
          <Crosshair aria-hidden />
          {t("Motiv in die Mitte")}
        </Button>
        <Button variant="paper" size="sm" aria-pressed={view.fit === "contain"} onClick={() => set({ ...view, fit: view.fit === "contain" ? "cover" : "contain" })}>
          {view.fit === "contain" ? <Scan aria-hidden /> : <Maximize2 aria-hidden />}
          {view.fit === "contain" ? t("Feld füllen") : t("Ganzes Foto zeigen")}
        </Button>
        <Button variant="paper" size="sm" onClick={() => set({ focus: [0.5, 0.5], zoom: 1, fit: "cover" })}>
          <RotateCcw aria-hidden />
          {t("Zurücksetzen")}
        </Button>
      </div>
    </MountedSheet>
  );
}
