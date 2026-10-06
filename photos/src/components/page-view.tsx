import Image from "next/image";

import { plate, type Page } from "@/content/plates";
import { PlateButton } from "@/components/plate-viewer";

// Alle Maße in cqw/cqh: jede Seite ist ein Size-Container.
// Doppelseiten haben 1:1.3, die Einzelseiten auf dem Telefon sind höher (compact).
const pageSizes = "(min-width: 768px) 38vw, 90vw";

function Gutter({ side }: { side: "left" | "right" }) {
  // Wölbung zum Bund hin: das Papier biegt sich, also wird es dunkler
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 z-20 w-[14cqw]"
      style={{
        [side === "left" ? "right" : "left"]: 0,
        background: `linear-gradient(to ${side === "left" ? "left" : "right"}, rgb(0 0 0 / 0.16), rgb(0 0 0 / 0.05) 30%, transparent)`,
      }}
    />
  );
}

function Caption({ no, className = "" }: { no: number; className?: string }) {
  const p = plate(no);
  return (
    <p className={`text-ink-2 leading-snug ${className}`} style={{ fontSize: "max(11px, 3.1cqw)" }}>
      <span className="text-ink font-semibold">{no}</span>
      <span className="ml-[2.4cqw]">{p.title}</span>
      {p.note && <span className="block pl-[calc(2.4cqw+1ch)]">{p.note}</span>}
    </p>
  );
}

export function PageView({
  page,
  side,
  eager = false,
  compact = false,
}: {
  page: Page;
  side: "left" | "right";
  eager?: boolean;
  compact?: boolean;
}) {
  const loading = eager ? "eager" : "lazy";

  switch (page.kind) {
    case "cover": {
      const p = plate(2);
      return (
        <div className="linen absolute inset-0 overflow-hidden bg-cloth [container-type:size]">
          {/* Falz am Rücken */}
          <div aria-hidden className="absolute inset-y-0 left-0 w-[5cqw] bg-cloth-deep/25" />
          <div aria-hidden className="absolute inset-y-0 left-[5cqw] w-px bg-cloth-deep/60" />
          {/* eingeklebtes Bild, wie bei den Fotobüchern der 70er: Kante leicht abgehoben */}
          <div className="absolute top-[11cqw] left-[18cqw] aspect-[4/5] w-[64cqw] bg-paper p-[1.6cqw] shadow-[1px_2px_3px_rgb(58_39_6/0.35),0_0_0_0.5px_rgb(58_39_6/0.2)]">
            <div className="relative h-full w-full overflow-hidden">
              <Image
                src={p.src}
                alt={p.alt}
                fill
                sizes="(min-width: 768px) 28vw, 64vw"
                className="object-cover object-[50%_40%]"
                preload
                placeholder="blur"
              />
            </div>
          </div>
          {/* Titel als flacher Druck auf dem Leinen */}
          <div className="text-cloth-ink absolute right-[10cqw] bottom-[10cqw] left-[18cqw]">
            <h1
              className="leading-[0.86] font-bold tracking-[-0.035em]"
              style={{ fontSize: "15.5cqw", fontVariationSettings: '"wdth" 78, "opsz" 96' }}
            >
              Fuji&shy;ventura
            </h1>
            <p className="mt-[3cqw] font-medium" style={{ fontSize: "4cqw" }}>
              Michel Leotta
            </p>
          </div>
        </div>
      );
    }

    case "endpaper":
      return (
        <div className="linen absolute inset-0 bg-cloth-deep/90 [container-type:size]">
          <Gutter side={side} />
        </div>
      );

    case "verso":
      return (
        <div className="paper absolute inset-0 [container-type:size]">
          <Gutter side="left" />
        </div>
      );

    case "title":
      return (
        <div className="paper text-ink absolute inset-0 [container-type:size]">
          <Gutter side={side} />
          <div className="absolute top-[40cqw] right-[8cqw] left-[12cqw]">
            <h2
              className="leading-[0.86] font-bold tracking-[-0.04em]"
              style={{ fontSize: "19cqw", fontVariationSettings: '"wdth" 75, "opsz" 96' }}
            >
              Fuji&shy;ventura
            </h2>
            <p className="mt-[5cqw] max-w-[60cqw] leading-snug" style={{ fontSize: "4.2cqw" }}>
              Fünfzehn Fotografien von Fuerteventura
            </p>
          </div>
          <p className="text-ink-2 absolute bottom-[12cqw] left-[12cqw]" style={{ fontSize: "3.4cqw" }}>
            Michel Leotta
          </p>
        </div>
      );

    case "caption":
      return (
        <div className="paper absolute inset-0 [container-type:size]">
          <Gutter side={side} />
          {/* aktiver Leerraum: die Gegenseite trägt nur die Unterschrift */}
          <Caption no={page.no} className="absolute bottom-[12cqw] left-[12cqw] max-w-[64cqw]" />
        </div>
      );

    case "plate": {
      const p = plate(page.no);
      const landscape = p.src.width > p.src.height;
      const box = landscape
        ? compact
          ? "top-[calc(50cqh-34cqw)] left-[4cqw] aspect-[3/2] w-[92cqw]"
          : "top-[calc(50cqh-30cqw)] left-[7cqw] aspect-[3/2] w-[86cqw]"
        : compact
          ? "top-[7cqw] left-[8cqw] aspect-[2/3] w-[84cqw]"
          : page.withCaption
            ? "top-[9cqw] left-[16cqw] aspect-[2/3] w-[68cqw]"
            : "top-[8cqw] left-[12cqw] aspect-[2/3] w-[76cqw]";
      const captionAt = landscape
        ? compact
          ? "top-[calc(50cqh+30cqw)] left-[4cqw]"
          : "top-[calc(50cqh+34cqw)] left-[7cqw]"
        : compact
          ? "top-[137cqw] left-[8cqw]"
          : "top-[115cqw] left-[16cqw]";
      return (
        <div className="paper absolute inset-0 [container-type:size]">
          <div data-plate-box={page.no} className={`absolute overflow-hidden ${box}`}>
            <Image
              src={p.src}
              alt={p.alt}
              fill
              sizes={pageSizes}
              className="object-cover"
              loading={loading}
              placeholder="blur"
            />
            <PlateButton no={page.no} />
          </div>
          {page.withCaption && <Caption no={page.no} className={`absolute max-w-[76cqw] ${captionAt}`} />}
          <Gutter side={side} />
        </div>
      );
    }

    case "double": {
      const p = plate(page.no);
      const left = page.half === "left";
      return (
        <div className="paper absolute inset-0 [container-type:size]">
          {/* ein Bild, über den Bund gesetzt: jede Seite zeigt ihre Hälfte */}
          <div
            data-plate-box={page.no}
            className="absolute top-[9cqw] aspect-[0.75/1] w-[80cqw] overflow-hidden"
            style={left ? { right: 0 } : { left: 0 }}
          >
            <div className="absolute inset-y-0 w-[200%]" style={{ left: left ? 0 : "-100%" }}>
              <Image
                src={p.src}
                alt={left ? p.alt : ""}
                aria-hidden={!left}
                fill
                sizes="(min-width: 768px) 72vw, 100vw"
                className="object-cover"
                loading={loading}
                placeholder="blur"
              />
            </div>
            <PlateButton no={page.no} />
          </div>
          {!left && <Caption no={page.no} className="absolute top-[118cqw] left-[4cqw]" />}
          <Gutter side={side} />
        </div>
      );
    }

    case "colophon":
      return (
        <div className="paper text-ink absolute inset-0 [container-type:size]">
          <Gutter side={side} />
          <div
            className="text-ink-2 absolute bottom-[12cqw] left-[12cqw] max-w-[66cqw] space-y-[2.4cqw] leading-snug"
            style={{ fontSize: "max(11px, 3.1cqw)" }}
          >
            <p className="text-ink font-semibold">Fujiventura</p>
            <p>Fünfzehn Fotografien, aufgenommen auf Fuerteventura mit einer Fuji.</p>
            <p>Fotografie und Gestaltung: Michel Leotta</p>
            <p>Gesetzt in Bricolage Grotesque.</p>
            <p>© 2026 Michel Leotta</p>
          </div>
        </div>
      );
  }
}
