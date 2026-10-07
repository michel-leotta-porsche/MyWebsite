"use client";

import { useMemo, useState } from "react";

import { techImportance, weights, type Characteristic, type Relation, type Requirement, type Roof } from "@/content/qfd";

// Das House of Quality als Zeichnung: Dach (Wechselwirkungen), Spaltenköpfe (Merkmale),
// Matrix (Beziehungen), links die gewichteten Anforderungen, unten Richtung und technische Bedeutung.

const COL = 38;
const ROW = 34;
const LEFT = 320;
const SYMBOL: Record<number, string> = { 9: "●", 3: "○", 1: "△" };
const ROOF_SYMBOL: Record<string, string> = { "++": "++", "+": "+", "-": "−", "--": "−−" };

export function HouseOfQuality({
  requirements,
  characteristics,
  relations,
  roof,
}: {
  requirements: Requirement[];
  characteristics: Characteristic[];
  relations: Relation[];
  roof: Roof[];
}) {
  const [row, setRow] = useState<string | null>(null);
  const [col, setCol] = useState<string | null>(null);
  const [roofHover, setRoofHover] = useState<Roof | null>(null);

  const w = useMemo(() => weights(requirements), [requirements]);
  const tech = useMemo(() => techImportance(requirements, characteristics, relations), [requirements, characteristics, relations]);
  const rel = useMemo(() => new Map(relations.map((r) => [`${r.req}|${r.tech}`, r.strength])), [relations]);
  const n = characteristics.length;
  const idx = new Map(characteristics.map((c, i) => [c.id, i]));
  const roofH = (n * COL) / 2;
  const headH = 236;
  const maxTech = Math.max(1, ...[...tech.values()].map((t) => t.rel));

  const hoverReq = requirements.find((r) => r.id === row);
  const hoverTech = characteristics.find((c) => c.id === col);
  const strength = row && col ? rel.get(`${row}|${col}`) : undefined;

  return (
    <div>
      <div tabIndex={0} aria-label="House of Quality, waagerecht scrollbar" className="overflow-x-auto pb-2">
        <div className="paper text-ink relative" style={{ width: LEFT + n * COL + 120, padding: 16 }}>
          {/* Dach */}
          <svg
            aria-label="Dach: Wechselwirkungen der Merkmale"
            role="img"
            width={n * COL}
            height={roofH + 4}
            className="block overflow-visible"
            style={{ marginLeft: LEFT }}
          >
            {/* Rautengitter */}
            {characteristics.map((_, i) => (
              <g key={i}>
                <line x1={i * COL} y1={roofH} x2={i * COL + ((n - i) * COL) / 2} y2={roofH - ((n - i) * COL) / 2} className="stroke-ink/15" />
                <line x1={(i + 1) * COL} y1={roofH} x2={((i + 1) * COL) / 2} y2={roofH - ((i + 1) * COL) / 2} className="stroke-ink/15" />
              </g>
            ))}
            <line x1={0} y1={roofH} x2={n * COL} y2={roofH} className="stroke-ink" />
            {roof.map((r, k) => {
              const a = idx.get(r.a);
              const b = idx.get(r.b);
              if (a === undefined || b === undefined) return null;
              const [i, j] = a < b ? [a, b] : [b, a];
              const x = ((i + j + 1) * COL) / 2;
              const y = roofH - ((j - i) * COL) / 2;
              const active = col === r.a || col === r.b || roofHover === r;
              return (
                <g key={k} onMouseEnter={() => setRoofHover(r)} onMouseLeave={() => setRoofHover(null)} className="cursor-default">
                  <rect x={x - 11} y={y - 9} width={22} height={18} className={active ? "fill-mark/40" : "fill-transparent"} />
                  <text x={x} y={y + 4} textAnchor="middle" className="fill-ink text-[11px] font-semibold">
                    {ROOF_SYMBOL[r.correlation]}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Spaltenköpfe */}
          <div className="flex" style={{ marginLeft: LEFT, height: headH }}>
            {characteristics.map((c) => (
              <div
                key={c.id}
                onMouseEnter={() => setCol(c.id)}
                onMouseLeave={() => setCol(null)}
                className={`relative border-l border-ink/15 ${col === c.id ? "bg-mark/25" : ""}`}
                style={{ width: COL }}
              >
                <span
                  title={c.name}
                  className="absolute bottom-2 left-1/2 origin-bottom-left overflow-hidden text-[12px] leading-tight text-ellipsis whitespace-nowrap"
                  style={{ transform: "rotate(-90deg) translateY(50%)", width: headH - 14 }}
                >
                  <span className="text-ink-2 mr-1 tabular-nums">{c.id}</span>
                  {c.name}
                </span>
              </div>
            ))}
          </div>

          {/* Matrix */}
          <div className="border-t border-ink" role="table" aria-label="Beziehungsmatrix">
            {requirements.map((r) => (
              <div key={r.id} role="row" className={`flex border-b border-ink/15 ${row === r.id ? "bg-mark/20" : ""}`} onMouseEnter={() => setRow(r.id)} onMouseLeave={() => setRow(null)}>
                <div role="rowheader" className="flex shrink-0 items-center justify-between gap-3 pr-3 text-[12px] leading-tight" style={{ width: LEFT, height: ROW }}>
                  <span className="min-w-0 truncate" title={r.text}>
                    <span className="text-ink-2 mr-1.5 tabular-nums">{r.id}</span>
                    {r.text}
                  </span>
                  <span className="text-ink shrink-0 font-semibold tabular-nums">{w.get(r.id)?.rel.toFixed(1)}</span>
                </div>
                {characteristics.map((c) => {
                  const s = rel.get(`${r.id}|${c.id}`);
                  return (
                    <div
                      key={c.id}
                      role="cell"
                      aria-label={s ? `${r.id} und ${c.id}: ${s}` : undefined}
                      onMouseEnter={() => setCol(c.id)}
                      className={`flex items-center justify-center border-l border-ink/15 text-[15px] ${col === c.id ? "bg-mark/20" : ""}`}
                      style={{ width: COL, height: ROW }}
                    >
                      {s ? SYMBOL[s] : ""}
                    </div>
                  );
                })}
              </div>
            ))}
            {/* Richtung */}
            <div className="flex border-b border-ink/15">
              <div className="text-ink-2 flex items-center pr-3 text-[12px]" style={{ width: LEFT, height: ROW }}>
                Optimierungsrichtung
              </div>
              {characteristics.map((c) => (
                <div key={c.id} className="flex items-center justify-center border-l border-ink/15 text-[14px]" style={{ width: COL, height: ROW }}>
                  {c.direction === "up" ? "↑" : c.direction === "down" ? "↓" : "◎"}
                </div>
              ))}
            </div>
            {/* Technische Bedeutung */}
            <div className="flex items-end">
              <div className="text-ink-2 flex items-end pr-3 pb-1 text-[12px]" style={{ width: LEFT, height: 110 }}>
                Technische Bedeutung in %
              </div>
              {characteristics.map((c) => {
                const t = tech.get(c.id)?.rel ?? 0;
                return (
                  <div key={c.id} className="flex flex-col items-center justify-end border-l border-ink/15" style={{ width: COL, height: 110 }}>
                    <span className="text-ink mb-1 text-[11px] font-semibold tabular-nums">{t.toFixed(0)}</span>
                    <span aria-hidden className="bg-ink w-3" style={{ height: (80 * t) / maxTech }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Erklärung zur Stelle unter dem Zeiger */}
      <p className="text-on-table-2 mt-4 min-h-[3em] max-w-[80ch] text-sm leading-relaxed" aria-live="polite">
        {roofHover ? (
          <>
            <span className="text-on-table font-semibold">
              {roofHover.a} und {roofHover.b} ({ROOF_SYMBOL[roofHover.correlation]}):
            </span>{" "}
            {roofHover.note}
          </>
        ) : hoverReq && hoverTech ? (
          <>
            <span className="text-on-table font-semibold">{hoverReq.id}</span> {hoverReq.text} <span className="mx-1">×</span>{" "}
            <span className="text-on-table font-semibold">{hoverTech.id}</span> {hoverTech.name}:{" "}
            {strength ? `Beziehung ${strength === 9 ? "stark" : strength === 3 ? "mittel" : "schwach"} (${strength})` : "keine Beziehung"}
          </>
        ) : hoverTech ? (
          <>
            <span className="text-on-table font-semibold">{hoverTech.id}</span> {hoverTech.name} ({hoverTech.unit}): heute {hoverTech.current}, Ziel{" "}
            {hoverTech.target}
          </>
        ) : hoverReq ? (
          <>
            <span className="text-on-table font-semibold">{hoverReq.id}</span> {hoverReq.rationale}
          </>
        ) : (
          "Zeig auf eine Zeile, eine Spalte oder ein Feld im Dach."
        )}
      </p>
    </div>
  );
}
