"use client";

import { useEffect, useRef } from "react";

// fester Zufall, damit der Schatten bei jedem Besuch gleich aussieht
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Palmwedel von oben rechts, klein gezeichnet: das Hochskalieren macht die Ränder weich wie echter Schatten */
function drawPalm(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const rnd = seeded(7);
  const ax = w * 1.04;
  const ay = -h * 0.12;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "rgb(12 10 8)"; // Schatten aus Basalt, nie Neutralschwarz
  ctx.lineCap = "round";
  const fronds = 11;
  for (let f = 0; f < fronds; f++) {
    // Wedel fächern nach unten links auf
    const dir = ((108 + (f / (fronds - 1)) * 118 + (rnd() - 0.5) * 10) * Math.PI) / 180;
    const len = w * (0.42 + rnd() * 0.3);
    const droop = 0.25 + rnd() * 0.25;
    const pt = (u: number) => {
      const x = ax + Math.cos(dir) * len * u;
      const y = ay + Math.sin(dir) * len * u + droop * len * u * u * 0.6;
      return [x, y] as const;
    };
    // Mittelrippe
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let u = 0; u <= 1.0001; u += 0.02) {
      const [x, y] = pt(u);
      if (u === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Fiederblättchen zu beiden Seiten, zur Spitze hin kürzer
    ctx.lineWidth = 1.5;
    for (let u = 0.12; u < 1; u += 0.026) {
      const [x, y] = pt(u);
      const [x2, y2] = pt(Math.min(1, u + 0.01));
      const a = Math.atan2(y2 - y, x2 - x);
      const leaf = len * (0.2 * (1 - u) + 0.05) * (0.8 + rnd() * 0.4);
      for (const side of [-1, 1]) {
        const la = a + side * (0.95 + rnd() * 0.25) + 0.35;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(
          x + Math.cos(la) * leaf * 0.6,
          y + Math.sin(la) * leaf * 0.6,
          x + Math.cos(la + 0.35) * leaf,
          y + Math.sin(la + 0.35) * leaf + leaf * 0.25,
        );
        ctx.stroke();
      }
    }
  }
}

/**
 * Licht über dem Tisch. sun: warmes Licht von oben rechts und ein Palmenschatten, der sich im Wind wiegt.
 * mist: kühles, gestreutes Licht ohne Pflanzenschatten.
 */
export function SunAndShade({ light = "sun" }: { light?: "sun" | "mist" }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current;
    if (light !== "sun") return;
    if (document.documentElement.classList.contains("ohne-schatten")) return;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const draw = () => {
      // bewusst grob: etwa ein Neuntel der Bildschirmauflösung, hochskaliert wird daraus weicher Schatten
      const w = Math.max(90, Math.round(window.innerWidth / 9));
      const h = Math.max(90, Math.round(window.innerHeight / 9));
      c.width = w;
      c.height = h;
      drawPalm(ctx, w, h);
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [light]);

  if (light === "mist")
    return <div aria-hidden data-shade className="mistlight pointer-events-none absolute inset-0 z-10 hidden md:block" />;

  return (
    <>
      {/* Schatten: Basalt mit wenig Deckkraft, damit Text auf dem Papier lesbar bleibt (≥ 4.5:1) */}
      <div aria-hidden data-shade className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-[0.12]">
        <div className="sway absolute -inset-[6%] origin-top-right">
          <canvas ref={canvas} className="h-full w-full" />
        </div>
      </div>
      {/* Sonne: weiches Licht, mischt sich mit Tisch und Papier darunter */}
      {/* nur ab Tablet: der Mischmodus über dem 3D-Buch kostet auf dem Telefon zu viel Speicher */}
      <div aria-hidden data-shade className="sunlight pointer-events-none absolute inset-0 z-10 hidden md:block" />
    </>
  );
}
