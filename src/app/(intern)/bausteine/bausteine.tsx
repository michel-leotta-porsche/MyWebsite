"use client";

import { Download, Eye, Gift, LogOut, MoreHorizontal, Pencil, Share2, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";

import { Button, IconButton, ToolGroup } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ListGroup, ListRow, StatusPill } from "@/components/ui/list";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { Swatches } from "@/components/ui/swatches";
import { notify, Toaster } from "@/components/ui/toaster";
import { CLOTHS, type ClothId } from "@/lib/store";

// Vorschau der Werkzeug-Bausteine (Etappe 1 von design-neu). Nur in der Entwicklung, im Export entfernt.

const SWATCHES = (Object.keys(CLOTHS) as ClothId[]).map((id) => ({ id, label: CLOTHS[id].label, color: CLOTHS[id].base, ink: CLOTHS[id].ink }));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-on-table/10 border-t pt-6">
      <h2 className="text-on-table-2 mb-4 text-xs font-semibold tracking-[0.08em] uppercase">{title}</h2>
      {children}
    </section>
  );
}

export function Bausteine() {
  const [sheet, setSheet] = useState(false);
  const [cloth, setCloth] = useState<string>("ringelblume");
  const [title, setTitle] = useState("Lissabon");
  const [mode, setMode] = useState<"hoch" | "quer">("hoch");
  const c = CLOTHS[cloth as ClothId];

  return (
    <main className="linen table-surface bg-table min-h-svh px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-24 md:px-8">
      <div className="mx-auto max-w-2xl space-y-10">
        <header>
          <p className="text-on-table-2 text-sm">Calima · intern</p>
          <h1 className="text-on-table mt-1 text-5xl leading-[0.9] font-bold tracking-[-0.04em]" style={{ fontVariationSettings: '"wdth" 76, "opsz" 96' }}>
            Bausteine
          </h1>
          <p className="text-on-table-2 mt-3 max-w-[60ch] text-base leading-relaxed">
            Werkzeuge sind rund und geben beim Drücken nach. Bücher, Seiten und Fotos bleiben eckig. Gelb als Fläche gibt es nur für den einen Hauptknopf einer Ansicht.
          </p>
        </header>

        <Section title="Knöpfe">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="cloth">
              <Gift aria-hidden />
              Hinlegen
            </Button>
            <Button>Ansehen</Button>
            <Button size="sm">Klein</Button>
            <Button disabled>Gesperrt</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ToolGroup label="Werkzeuge">
              <IconButton label="Rückgängig">
                <Undo2 aria-hidden />
              </IconButton>
              <IconButton label="Ansehen">
                <Eye aria-hidden />
              </IconButton>
              <Menu
                trigger={
                  <IconButton label="Mehr">
                    <MoreHorizontal aria-hidden />
                  </IconButton>
                }
              >
                <MenuItem icon={<Pencil aria-hidden />}>Titel und Einband</MenuItem>
                <MenuItem icon={<Share2 aria-hidden />}>Link kopieren</MenuItem>
                <MenuItem icon={<Download aria-hidden />}>Als Datei sichern</MenuItem>
                <MenuSeparator />
                <MenuItem icon={<Trash2 aria-hidden />} danger>
                  Buch löschen
                </MenuItem>
              </Menu>
            </ToolGroup>
            <Segmented
              label="Ausrichtung"
              value={mode}
              onChange={setMode}
              options={[
                { value: "hoch", label: "Hoch" },
                { value: "quer", label: "Quer" },
              ]}
            />
          </div>
        </Section>

        <Section title="Blatt und Hinweis">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setSheet(true)}>Buch einstellen</Button>
            <Button
              onClick={() =>
                notify("In die Ablage gelegt", {
                  action: { label: "Rückgängig", onClick: () => notify("Zurückgelegt") },
                })
              }
            >
              Hinweis zeigen
            </Button>
          </div>
          <Sheet open={sheet} onOpenChange={setSheet} title="Buch" description="Titel und Einband siehst du sofort auf dem Buch.">
            <div className="mb-6 flex justify-center py-2">
              <div
                aria-hidden
                className="linen relative aspect-[2/3] w-32 shadow-[0_20px_30px_-16px_rgb(12_10_8/0.8)] transition-colors duration-500"
                style={{ backgroundColor: c.base, color: c.ink }}
              >
                <span className="absolute right-3 bottom-3 left-4 text-lg leading-[0.9] font-bold tracking-[-0.04em] break-words" style={{ fontVariationSettings: '"wdth" 76' }}>
                  {title || "Ohne Titel"}
                </span>
              </div>
            </div>
            <div className="space-y-5">
              <Field label="Titel" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
              <Field label="Zeile darunter" hint="Leer lassen: Anzahl der Fotos" maxLength={60} />
              <Swatches label="Farbe des Einbands" items={SWATCHES} value={cloth} onChange={setCloth} />
              <Button variant="ink" className="w-full" onClick={() => setSheet(false)}>
                Fertig
              </Button>
            </div>
          </Sheet>
        </Section>

        <Section title="Liste">
          <ListGroup label="Hingelegt für">
            <ListRow
              lead={<span className="linen block h-[30px] w-[22px]" style={{ backgroundColor: CLOTHS.ringelblume.base }} />}
              title="Anna"
              detail="Fuerteventura · Seite 14 gemerkt"
              trail={<StatusPill fresh>Zettel</StatusPill>}
              onClick={() => notify("Würde Annas Zettel öffnen")}
            />
            <ListRow
              lead={<span className="linen block h-[30px] w-[22px]" style={{ backgroundColor: CLOTHS.nebel.base }} />}
              title="Papa"
              detail="Japan · noch nicht geöffnet"
              trail={<StatusPill>offen</StatusPill>}
            />
          </ListGroup>
          <ListGroup label="Konto" className="mt-6">
            <ListRow lead={<Download aria-hidden />} title="Bücher sichern" detail="als Datei auf dieses Gerät" onClick={() => {}} />
            <ListRow lead={<LogOut aria-hidden />} title="Abmelden" />
            <ListRow lead={<Trash2 aria-hidden />} title="Konto löschen" danger onClick={() => {}} />
          </ListGroup>
        </Section>
      </div>
      <Toaster />
    </main>
  );
}
