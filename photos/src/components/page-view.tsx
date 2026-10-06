import Image from "next/image";

import { plate, type Page } from "@/content/plates";

// Alle Maße in cqw/cqh: jede Seite ist ein Size-Container (Seitenverhältnis 1:1.3)
const pageSizes = "(min-width: 768px) 38vw, 90vw";

function Gutter({ side }: { side: "left" | "right" }) {
  // Wölbung zum Bund hin: das Papier biegt sich, also wird es dunkler
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 z-10 w-[14cqw]"
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
}: {
  page: Page;
  side: "left" | "right";
  eager?: boolean;
}) {
  const loading = eager ? "eager" : "lazy";

  switch (page.kind) {
    case "cover": {
      const p = plate(2);
      return (
        <div className="linen absolute inset-0 overflow-hidden bg-cloth [container-type:size]">
          {/* Falz am Rücken */}
          <div aria-hidden className="absolute inset-y-0 left-[5cqw] w-px bg-cloth-deep/60" />
          <div aria-hidden className="absolute inset-y-0 left-0 w-[5cqw] bg-cloth-deep/25" />
          {/* eingeklebtes Bild, wie bei den Fotobüchern der 70er */}
          <div className="absolute top-[11cqw] left-[18cqw] aspect-[4/5] w-[64cqw] bg-paper p-[1.6cqw] shadow-[0_1px_2px_rgb(58_39_6/0.35)]">
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
          <div className="absolute right-[10cqw] bottom-[10cqw] left-[18cqw]">
            <h1
              className="deboss leading-[0.86] font-bold tracking-[-0.035em]"
              style={{ fontSize: "15.5cqw", fontVariationSettings: '"wdth" 78, "opsz" 96' }}
            >
              Fuji&shy;ventura
            </h1>
            <p className="deboss mt-[3cqw] font-medium" style={{ fontSize: "4cqw" }}>
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
          <p className="text-ink-2 absolute top-[12cqw] left-[12cqw]" style={{ fontSize: "3.4cqw" }}>
            Michel Leotta
          </p>
          <div className="absolute top-[44cqw] left-[12cqw] right-[8cqw]">
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
        ? "top-[calc(50cqh-30cqw)] left-[7cqw] aspect-[3/2] w-[86cqw]"
        : page.withCaption
          ? "top-[9cqw] left-[16cqw] aspect-[2/3] w-[68cqw]"
          : "top-[8cqw] left-[12cqw] aspect-[2/3] w-[76cqw]";
      return (
        <div className="paper absolute inset-0 [container-type:size]">
          <div className={`absolute overflow-hidden ${box}`}>
            <Image
              src={p.src}
              alt={p.alt}
              fill
              sizes={pageSizes}
              className="object-cover"
              loading={loading}
              placeholder="blur"
            />
          </div>
          {page.withCaption && (
            <Caption
              no={page.no}
              className={`absolute max-w-[70cqw] ${landscape ? "top-[calc(50cqh+34cqw)] left-[7cqw]" : "top-[115cqw] left-[16cqw]"}`}
            />
          )}
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
            <p>© {new Date().getFullYear()} Michel Leotta</p>
          </div>
        </div>
      );
  }
}
