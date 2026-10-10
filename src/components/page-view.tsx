"use client";

import Image from "next/image";
import { createContext, useContext, type CSSProperties } from "react";

import { plateOf, type BookData, type Page } from "@/content/books";
import { CAPTION, FONTS, LEADING, layoutPage, type El, type Tone } from "@/content/layout";
import { PlateButton, usePlateName } from "@/components/plate-viewer";
import { useT } from "@/lib/i18n";
import { FOLD_WIDTH, foldGradient, printedStyle } from "@/lib/book-look";

// Setzt eine Seite aus der Elementliste von layoutPage. Alle Maße in cqw: jede Seite ist ein Size-Container.

/** Sprung aus dem Bildverzeichnis zur Tafel */
export const JumpContext = createContext<(no: number) => void>(() => {});

const toneClass: Record<Tone, string> = { ink: "text-ink", ink2: "text-ink-2", clothInk: "", paper: "text-paper" };

function Gutter({ side }: { side: "left" | "right" }) {
  // Falz: Wölbung zum Bund hin, gleich gemalt wie in der Textur des WebGL-Blatts
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 z-[300]"
      style={{ [side === "left" ? "right" : "left"]: 0, width: `${FOLD_WIDTH}cqw`, background: foldGradient(side) }}
    />
  );
}

const box = (x: number, y: number, w: number, h: number): CSSProperties => ({
  left: `${x}cqw`,
  top: `${y}cqw`,
  width: `${w}cqw`,
  height: `${h}cqw`,
});

function Caption({ book, el, z }: { book: BookData; el: Extract<El, { t: "caption" }>; z: number }) {
  const p = plateOf(book, el.no);
  const right = el.align === "right";
  return (
    <p
      className={`text-ink-2 absolute ${right ? "text-right" : ""}`}
      style={{
        zIndex: z,
        top: `${el.y}cqw`,
        [right ? "right" : "left"]: right ? `${100 - el.x}cqw` : `${el.x}cqw`,
        maxWidth: `${el.w}cqw`,
        fontSize: `max(11px, ${CAPTION}cqw)`,
        lineHeight: LEADING,
      }}
    >
      <span className={`text-ink font-semibold ${el.stack ? "block" : ""}`}>{el.no}</span>
      <span className={el.stack ? "block [overflow-wrap:anywhere]" : "ml-[0.6em]"}>{p.title}</span>
      {p.note && <span className="block">{p.note}</span>}
    </p>
  );
}

function Thumb({ book, el }: { book: BookData; el: Extract<El, { t: "thumb" }> }) {
  const jump = useContext(JumpContext);
  const p = plateOf(book, el.no);
  const t = useT();
  const plateName = usePlateName();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        jump(el.no);
      }}
      aria-label={t("Zu {plate}", { plate: plateName(el.no, p.title) })}
      className="group absolute focus-visible:outline-ink"
      style={box(el.x, el.y, el.w, el.h)}
    >
      <Image
        src={p.thumb}
        alt=""
        fill
        sizes="120px"
        className="object-contain object-bottom transition-opacity duration-150 group-hover:opacity-80"
        loading="lazy"
      />
    </button>
  );
}

/** sizes für ein Foto, das w Prozent der Seitenbreite einnimmt */
type SizesFor = (w: number) => string;
// Standard: Seite im offenen Buch, Doppelseite ab Tablet, Einzelseite auf dem Telefon
const bookSizes: SizesFor = (w) => `(min-width: 768px) ${Math.ceil(w * 0.4)}vw, ${Math.ceil(w * 0.96)}vw`;

function Element({ book, el, eager, z, sizes, paper, pageH }: { book: BookData; el: El; eager: boolean; z: number; sizes: SizesFor; paper: boolean; pageH: number }) {
  switch (el.t) {
    case "img": {
      const p = plateOf(book, el.no);
      // die Fläche zum Vergrößern liegt nur über dem sichtbaren Teil der Seite
      const vx = Math.max(0, el.x);
      const vw = Math.min(100, el.x + el.w) - vx;
      const hidden = el.x < 0;
      return (
        <>
          <div className="absolute overflow-hidden" style={{ ...box(el.x, el.y, el.w, el.h), zIndex: z }}>
            <Image
              src={p.src}
              alt={hidden ? "" : p.alt}
              aria-hidden={hidden || undefined}
              fill
              sizes={sizes(el.w)}
              className={el.fit === "contain" ? "object-contain" : "object-cover"}
              style={{
                objectPosition: el.fit === "contain" ? "50% 50%" : `${el.focus[0] * 100}% ${el.focus[1] * 100}%`,
                // Zoom um den Fokuspunkt; dieselbe Rechnung zeichnet die Textur (page-texture.ts)
                transform: el.zoom !== 1 && el.fit !== "contain" ? `scale(${el.zoom})` : undefined,
                transformOrigin: `${el.focus[0] * 100}% ${el.focus[1] * 100}%`,
              }}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : undefined}
            />
          </div>
          {/* nur auf Papier (auf Leinen ist das Foto ein eingeklebter Abzug); im Anschnitt liegt die Kante außerhalb der Seite */}
          {paper && el.fit !== "contain" && (
            <div
              aria-hidden
              className="print-edge"
              style={{
                zIndex: z,
                left: el.x <= 0 ? "-8px" : `${el.x}cqw`,
                top: el.y <= 0 ? "-8px" : `${el.y}cqw`,
                right: el.x + el.w >= 100 ? "-8px" : `calc(100cqw - ${el.x + el.w}cqw)`,
                bottom: el.y + el.h >= pageH ? "-8px" : `calc(100cqh - ${el.y + el.h}cqw)`,
              }}
            />
          )}
          {el.plate && (
            <div data-plate-box={el.no} className="absolute" style={{ ...box(vx, el.y, vw, el.h), zIndex: z }}>
              <PlateButton book={book} no={el.no} />
            </div>
          )}
        </>
      );
    }
    case "caption":
      return <Caption book={book} el={el} z={z} />;
    case "colophon":
      // ein Block, der von unten wächst: bricht eine Zeile auf dem Telefon öfter um, schiebt sie die anderen nach oben
      return (
        <div
          className="absolute flex flex-col"
          style={{ zIndex: z, left: `${el.x}cqw`, top: `${el.bottom}cqw`, transform: "translateY(-100%)", maxWidth: `${el.w}cqw`, gap: `${el.gap}cqw` }}
        >
          {el.lines.map((line, i) => (
            <p
              key={i}
              className={toneClass[i === 0 ? "ink" : "ink2"]}
              style={{ fontSize: `max(11px, ${el.size}cqw)`, fontWeight: i === 0 ? 600 : 400, lineHeight: el.lh }}
            >
              {line}
            </p>
          ))}
        </div>
      );
    case "text": {
      const Tag = el.display ? "h2" : "p";
      return (
        <Tag
          className={`absolute ${toneClass[el.tone]} ${el.display ? "tracking-[-0.035em]" : ""}`}
          style={{
            zIndex: z,
            top: `${el.y}cqw`,
            left: `${el.x}cqw`,
            // mittig oder rechts braucht die volle Rahmenbreite
            ...(el.align && el.align !== "left" && el.w ? { width: `${el.w}cqw`, textAlign: el.align } : { maxWidth: el.w ? `${el.w}cqw` : undefined }),
            fontFamily: el.font ? FONTS[el.font].css : undefined,
            fontStyle: el.italic ? "italic" : undefined,
            fontSize: el.size < 3.4 ? `max(${el.size < 2.4 ? 9 : 11}px, ${el.size}cqw)` : `${el.size}cqw`,
            fontWeight: el.weight,
            lineHeight: el.lh,
            whiteSpace: el.lines ? "pre-line" : el.w ? undefined : "nowrap",
            color: el.color ?? (el.tone === "clothInk" ? book.cloth.ink : undefined),
            fontVariationSettings: el.display ? '"wdth" 78, "opsz" 96' : undefined,
          }}
        >
          {el.text}
        </Tag>
      );
    }
    case "thumb":
      return <Thumb book={book} el={el} />;
    case "rect":
      return <div aria-hidden className="absolute" style={{ ...box(el.x, el.y, el.w, el.h), background: el.color }} />;
    case "frame":
      return (
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{ ...box(el.x, el.y, el.w, el.h), boxShadow: `inset 0 0 0 ${el.width}cqw ${el.color}` }}
        />
      );
    case "path":
      // Pfad in cqw: viewBox = Seite (100 breit, Höhe in cqw); dieselben Pfade zeichnet die Textur
      return (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          style={{ zIndex: z }}
          viewBox={`0 0 100 ${book.aspect * 100}`}
          preserveAspectRatio="none"
        >
          <path
            d={el.d}
            fill={el.fill ?? "none"}
            stroke={el.stroke}
            strokeWidth={el.width}
            strokeDasharray={el.dash?.join(" ")}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={el.opacity}
          />
        </svg>
      );
  }
}

export function PageView({
  book,
  page,
  side,
  eager = false,
  sizes = bookSizes,
}: {
  book: BookData;
  page: Page;
  side: "left" | "right";
  eager?: boolean;
  /** Wie breit Fotos dargestellt werden, falls die Seite kleiner ist als im offenen Buch (Einband auf dem Tisch) */
  sizes?: SizesFor;
}) {
  const layout = layoutPage(book, page, side);
  const bg = layout.bg === "paper" ? undefined : layout.bg === "cloth" ? book.cloth.base : book.cloth.deep;
  return (
    <div
      // isolate: die Stapel-Nummern der Elemente gelten nur innerhalb dieser Seite, nie über andere Blätter hinweg
      className={`absolute inset-0 isolate overflow-hidden [container-type:size] ${layout.bg === "paper" ? "paper" : ""} ${layout.linen ? "linen" : ""}`}
      style={{ backgroundColor: bg, ...printedStyle }}
    >
      {layout.els.map((el, i) => (
        <Element key={i} book={book} el={el} eager={eager} z={i + 1} sizes={sizes} paper={layout.bg === "paper"} pageH={100 * book.aspect} />
      ))}
      {/* Papier über allem: die Fotos sind gedruckt, nicht aufgeklebt */}
      {layout.bg === "paper" && <div aria-hidden className="printed z-[299]" />}
      {layout.gutter && <Gutter side={side} />}
    </div>
  );
}
