import { colWidth, pageNos, plateOf, typeArea, type BookData, type FreeEl, type Page, type TextRole } from "@/content/books";

// Eine Seite als Liste von Elementen in cqw (Seitenbreite = 100). Dieselbe Liste setzt das HTML
// (page-view.tsx) und zeichnet die Textur fürs Umblättern (page-texture.ts), damit nichts springt.

export type Tone = "ink" | "ink2" | "clothInk" | "paper";

export type El =
  /** Foto, beschnitten auf den Kasten (object-fit: cover) */
  | {
      t: "img";
      no: number;
      x: number;
      y: number;
      w: number;
      h: number;
      focus: [number, number];
      plate: boolean;
      /** Vergrößerung um den Fokuspunkt (1 = füllt den Kasten) */
      zoom: number;
      fit: "cover" | "contain";
    }
  /** Bildunterschrift; y ist die Oberkante, align die Kante, an der sie hängt */
  | { t: "caption"; no: number; x: number; y: number; w: number; align: "left" | "right"; stack?: boolean }
  | {
      t: "text";
      text: string;
      x: number;
      y: number;
      /** Schriftgröße in cqw */
      size: number;
      weight: 400 | 500 | 600 | 700;
      tone: Tone;
      lh: number;
      w?: number;
      display?: boolean;
      /** Zeilenumbrüche im Text bleiben stehen (Absätze) */
      lines?: boolean;
    }
  /** Abzug im Bildverzeichnis, ganz sichtbar (contain), springt zur Tafel */
  | { t: "thumb"; no: number; x: number; y: number; w: number; h: number }
  | { t: "rect"; x: number; y: number; w: number; h: number; color: string }
  /** Prägemulde: Linie innen um das eingelassene Bild */
  | { t: "frame"; x: number; y: number; w: number; h: number; color: string; width: number };

export type Layout = {
  bg: "paper" | "cloth" | "clothDeep";
  linen: boolean;
  gutter: boolean;
  els: El[];
};

/** Schriftgröße der Bildunterschrift in cqw, mindestens 11px */
export const CAPTION = 2.6;
export const LEADING = 1.375;

const ratio = (book: BookData, no: number) => {
  const { width, height } = plateOf(book, no).src;
  return height / width;
};
/** Ausschnitt eines Fotos: Fokus, Zoom und ob es ganz gezeigt wird */
const view = (book: BookData, no: number) => {
  const p = plateOf(book, no);
  return { focus: p.focus ?? ([0.5, 0.5] as [number, number]), zoom: p.zoom ?? 1, fit: p.fit ?? ("cover" as const) };
};

/** Grob geschätzte Zeilen, um Blöcke untereinander zu setzen (HTML und Textur nutzen dieselbe Schätzung) */
export const estimateLines = (text: string, size: number, width: number) =>
  text.split("\n").reduce((a, para) => a + Math.max(1, Math.ceil((para.length * size * 0.52) / width)), 0);

/** Textseite: Größen der beiden Stile in cqw */
export const TEXT_STYLE = { text: { size: 3.2, lh: 1.5 }, gross: { size: 4.4, lh: 1.35 } } as const;

/** Textrahmen auf freien Seiten: drei gesetzte Stile, keine Regler */
export const TEXT_ROLE: Record<TextRole, { size: number; weight: 400 | 700; lh: number; tone: Tone; display?: boolean; label: string }> = {
  heading: { size: 6, weight: 700, lh: 1.02, tone: "ink", display: true, label: "Überschrift" },
  body: { size: 3.2, weight: 400, lh: 1.5, tone: "ink", label: "Absatz" },
  note: { size: CAPTION, weight: 400, lh: LEADING, tone: "ink2", label: "Notiz" },
};

/** Höhe eines Textrahmens in cqw (dieselbe Schätzung setzt HTML und Textur) */
export const textHeight = (text: string, role: TextRole, w: number) => {
  const st = TEXT_ROLE[role];
  return estimateLines(text || " ", st.size, w) * st.size * st.lh;
};

/**
 * Raster einer Seite in cqw: 6 Spalten und 9 Zeilen im Satzspiegel, je 2cqw Fuge.
 * xs/ys sind alle Linien, an denen eine Kante einrasten darf (Spaltenanfänge und -enden, Seitenkanten).
 */
export function gridLines(book: Pick<BookData, "aspect" | "bottom">, side: "left" | "right") {
  const ta = typeArea(book, side);
  const H = book.aspect * 100;
  const cw = (ta.w - 5 * 2) / 6;
  const rh = (ta.h - 8 * 2) / 9;
  const cols: number[] = [];
  const rows: number[] = [];
  for (let i = 0; i < 6; i++) cols.push(ta.x + i * (cw + 2), ta.x + i * (cw + 2) + cw);
  for (let i = 0; i < 9; i++) rows.push(ta.y + i * (rh + 2), ta.y + i * (rh + 2) + rh);
  return { ta, H, cw, rh, colPitch: cw + 2, rowPitch: rh + 2, xs: [0, ...cols, 100], ys: [0, ...rows, H] };
}

type CBox = { x: number; y: number; w: number; h: number };
const hits = (a: CBox, b: CBox) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Unterschrift eines Fotos auf einer freien Seite: unter dem Bild an der Außenkante, sonst im Papierstreifen außen, sonst keine */
function autoCaption(no: number, b: CBox, side: "left" | "right", book: BookData, others: CBox[]): El | null {
  const ta = typeArea(book, side);
  const H = book.aspect * 100;
  const y = b.y + b.h + 3;
  const left = Math.max(b.x, ta.x);
  const right = Math.min(b.x + b.w, ta.x + ta.w);
  const w = Math.max(30, Math.min(60, right - left));
  const below: CBox = side === "left" ? { x: left, y, w, h: 7 } : { x: right - w, y, w, h: 7 };
  if (y + 7 <= H - 3 && right - left > 8 && !others.some((o) => hits(o, below)))
    return side === "left" ? { t: "caption", no, x: left, y, w, align: "left" } : { t: "caption", no, x: right, y, w, align: "right" };
  const strip = side === "right" ? 100 - (b.x + b.w) : b.x;
  if (strip >= 14) {
    const sx = side === "right" ? b.x + b.w + 2.5 : 2.5;
    const sy = Math.min(b.y + b.h, ta.y + ta.h) - 10;
    const box: CBox = { x: sx, y: sy, w: strip - 5, h: 10 };
    if (!others.some((o) => hits(o, box))) return { t: "caption", no, x: sx, y: sy, w: strip - 5, align: "left", stack: true };
  }
  return null;
}

function layoutFree(book: BookData, items: FreeEl[], side: "left" | "right"): El[] {
  const H = book.aspect * 100;
  const toC = (b: FreeEl["box"]): CBox => ({ x: b.x, w: b.w, y: (b.y / 100) * H, h: (b.h / 100) * H });
  const boxes = items.map((it) => {
    const c = toC(it.box);
    // Textrahmen: Höhe folgt dem Text
    return it.t === "text" ? { ...c, h: textHeight(it.text, it.role, c.w) } : c;
  });
  const els: El[] = [];
  items.forEach((it, i) => {
    const b = boxes[i];
    if (it.t === "photo") {
      els.push({ t: "img", no: it.no, ...b, ...(it.crop ?? view(book, it.no)), plate: true });
      // ein Foto über den Bund trägt nur eine Unterschrift: auf der Seite, auf der mehr von ihm liegt
      const here = Math.min(100, b.x + b.w) - Math.max(0, b.x);
      const there = b.x < 0 ? -b.x : Math.max(0, b.x + b.w - 100);
      const visible = here > 0 && (b.x < 0 ? here > there : here >= there);
      if (it.caption === "auto" && visible) {
        const cap = autoCaption(it.no, { ...b, x: Math.max(0, b.x), w: Math.min(100, b.x + b.w) - Math.max(0, b.x) }, side, book, boxes.filter((_, n) => n !== i));
        if (cap) els.push(cap);
      }
    } else {
      const st = TEXT_ROLE[it.role];
      els.push({ t: "text", text: it.text, x: b.x, y: b.y, size: st.size, weight: st.weight, tone: it.light ? "paper" : st.tone, lh: st.lh, w: b.w, display: st.display, lines: true });
    }
  });
  return els;
}

export function layoutPage(book: BookData, page: Page, side: "left" | "right"): Layout {
  const H = book.aspect * 100;
  const ta = typeArea(book, side);
  const paper = (els: El[], gutter = true): Layout => ({ bg: "paper", linen: false, gutter, els });
  // Unterschrift an der Außenkante: links auf der linken Seite, rechts auf der rechten
  const outerCaption = (no: number, x: number, w: number, y: number): El =>
    side === "left"
      ? { t: "caption", no, x, y, w, align: "left" }
      : { t: "caption", no, x: x + w, y, w, align: "right" };

  switch (page.kind) {
    case "cover": {
      const no = book.coverNo;
      const w = 54;
      const h = w * Math.min(1.5, ratio(book, no));
      const x = 12;
      const y = 9;
      const titleSize = 11;
      return {
        bg: "cloth",
        linen: true,
        gutter: false,
        els: [
          // Falz am Rücken
          { t: "rect", x: 0, y: 0, w: 5, h: H, color: "rgb(12 10 8 / 0.08)" },
          { t: "rect", x: 5, y: 0, w: 0.25, h: H, color: "rgb(12 10 8 / 0.18)" },
          { t: "img", no, x, y, w, h, ...view(book, no), plate: false },
          { t: "frame", x, y, w, h, color: book.cloth.deep, width: 0.5 },
          {
            t: "text",
            text: book.title,
            x,
            y: H - book.bottom - titleSize * 0.95,
            size: titleSize,
            weight: 700,
            tone: "clothInk",
            lh: 0.9,
            display: true,
          },
          { t: "text", text: book.author ?? "Michel Leotta", x, y: H - book.bottom + 2.4, size: 3.6, weight: 500, tone: "clothInk", lh: 1.2 },
        ],
      };
    }

    case "endpaper":
      return { bg: "clothDeep", linen: true, gutter: true, els: [] };

    case "verso":
      return paper([]);

    case "title": {
      const els: El[] = [
        { t: "text", text: book.title, x: ta.x, y: ta.y, size: 7, weight: 700, tone: "ink", lh: 0.95, display: true },
        { t: "text", text: book.subtitle, x: ta.x, y: ta.y + 9.5, size: 3, weight: 400, tone: "ink", lh: LEADING },
      ];
      if (book.places)
        els.push({ t: "text", text: book.places, x: ta.x, y: ta.y + 14, size: 3, weight: 400, tone: "ink2", lh: LEADING });
      els.push({ t: "text", text: book.author ?? "Michel Leotta", x: ta.x, y: ta.y + ta.h - 3, size: 3, weight: 400, tone: "ink2", lh: LEADING });
      return paper(els);
    }

    case "full": {
      const no = page.no;
      return paper([{ t: "img", no, x: 0, y: 0, w: 100, h: H, ...view(book, no), plate: true }], true);
    }

    case "plate": {
      const no = page.no;
      return paper([
        { t: "img", no, x: ta.x, y: ta.y, w: ta.w, h: ta.h, ...view(book, no), plate: true },
        outerCaption(no, ta.x, ta.w, ta.y + ta.h + 3),
      ]);
    }

    case "small": {
      const no = page.no;
      const w = colWidth(page.cols);
      const h = w * ratio(book, no);
      // außen ist auf der rechten Seite rechts, auf der linken links
      const atRight = (page.align === "outer") === (side === "right");
      const x = atRight ? ta.x + ta.w - w : ta.x;
      const y = page.row === "top" ? ta.y : ta.y + ta.h - h;
      const cap: El = atRight
        ? { t: "caption", no, x: x + w, y: y + h + 3, w: 60, align: "right" }
        : { t: "caption", no, x, y: y + h + 3, w: 60, align: "left" };
      return paper([{ t: "img", no, x, y, w, h, ...view(book, no), plate: true }, cap]);
    }

    case "landscape": {
      const no = page.no;
      const h = 100 * ratio(book, no);
      return paper([
        { t: "img", no, x: 0, y: ta.y, w: 100, h, ...view(book, no), plate: true },
        outerCaption(no, ta.x, ta.w, ta.y + h + 3),
      ]);
    }

    case "across": {
      const no = page.no;
      // ein Bild über beide Seiten, bis an alle Kanten; jede Seite zeigt ihre Hälfte
      return paper([
        { t: "img", no, x: page.half === "left" ? 0 : -100, y: 0, w: 200, h: H, ...view(book, no), plate: true },
      ]);
    }

    case "blank":
      return paper([{ t: "caption", no: page.no, x: ta.x, y: ta.y + ta.h - 6, w: 60, align: "left" }]);

    case "tall": {
      const no = page.no;
      const w = H / ratio(book, no);
      // am Bund, oben und unten randlos; außen bleibt ein Papierstreifen für die Unterschrift
      const x = side === "right" ? 0 : 100 - w;
      const strip = 100 - w;
      const cx = side === "right" ? w + 2.5 : 2.5;
      return paper([
        { t: "img", no, x, y: 0, w, h: H, ...view(book, no), plate: true },
        // schmaler Streifen: Nummer und Titel untereinander
        { t: "caption", no, x: cx, y: ta.y + ta.h - 10, w: strip - 5, align: "left", stack: true },
      ]);
    }

    case "text": {
      const st = TEXT_STYLE[page.style] ?? TEXT_STYLE.text;
      const els: El[] = [];
      let y = ta.y;
      if (page.heading) {
        const hs = 6;
        els.push({ t: "text", text: page.heading, x: ta.x, y, size: hs, weight: 700, tone: "ink", lh: 1.02, w: ta.w, display: true });
        y += estimateLines(page.heading, hs, ta.w) * hs * 1.02 + 5;
      }
      els.push({ t: "text", text: page.body, x: ta.x, y, size: st.size, weight: 400, tone: "ink", lh: st.lh, w: 66, lines: true });
      return paper(els);
    }

    case "free":
      return paper(layoutFree(book, page.items, side));

    case "index": {
      const n = book.plates.length;
      const gap = 2;
      // so viele Spalten, dass alle Abzüge in den Satzspiegel passen (bis 60 Fotos)
      const fits = (c: number) => {
        const w = (ta.w - (c - 1) * gap) / c;
        return 7 + Math.ceil(n / c) * (w * book.aspect + 5) <= ta.h;
      };
      const cols = [n > 9 ? 6 : 4, 6, 8, 10, 12].find(fits) ?? 12;
      const cw = (ta.w - (cols - 1) * gap) / cols;
      const ch = cw * book.aspect;
      const els: El[] = [
        { t: "text", text: "Tafeln", x: ta.x, y: ta.y, size: CAPTION, weight: 600, tone: "ink", lh: LEADING },
      ];
      book.plates.forEach((p, i) => {
        const x = ta.x + (i % cols) * (cw + gap);
        const y = ta.y + 7 + Math.floor(i / cols) * (ch + 5);
        els.push({ t: "thumb", no: p.no, x, y, w: cw, h: ch });
        els.push({ t: "text", text: String(p.no), x, y: y + ch + 0.8, size: 2.1, weight: 400, tone: "ink2", lh: 1.2 });
      });
      return paper(els);
    }

    case "colophon": {
      // von unten bündig: geschätzte Zeilen, damit HTML und Textur gleich stehen
      const lines = book.colophon;
      const size = CAPTION;
      const lh = size * LEADING;
      const rows = lines.map((l) => Math.max(1, Math.ceil((l.length * size * 0.5) / 66)));
      const total = rows.reduce((a, r) => a + r * lh, 0) + (lines.length - 1) * 2;
      let y = ta.y + ta.h - total;
      const els: El[] = [];
      lines.forEach((text, i) => {
        els.push({ t: "text", text, x: ta.x, y, size, weight: i === 0 ? 600 : 400, tone: i === 0 ? "ink" : "ink2", lh: LEADING, w: 66 });
        y += rows[i] * lh + 2;
      });
      return paper(els);
    }
  }
}

/** Tafeln ohne Unterschrift auf der Seite: ihr Titel steht in der Kopfzeile */
export const captionless = (page: Page) => page.kind === "full" || page.kind === "across";

/** Tafelnummern einer Seite, deren Titel in die Kopfzeile gehört */
export function headPlates(book: BookData, page: Page, side: "left" | "right"): number[] {
  if (page.kind !== "free") return captionless(page) ? pageNos(page) : [];
  const shown = new Set(layoutPage(book, page, side).els.flatMap((e) => (e.t === "caption" ? [e.no] : [])));
  return pageNos(page).filter((no) => !shown.has(no));
}
