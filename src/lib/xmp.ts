// Liest Lightroom- und Camera-Raw-Einstellungen (crs:) aus einem XMP-Text: aus einer Preset-Datei
// oder aus dem XMP-Block eines exportierten JPGs. Nur globale Werte; Masken, Zuschnitt, Retusche bleiben weg.

import { de } from "@/lib/i18n";

export type LightroomSettings = {
  name?: string;
  basics: { key: string; label: string; value: number; unit?: string }[];
  /** Tonkurve als Punkte 0..255 */
  curve: [number, number][];
  hsl: { color: string; hue: number; sat: number; lum: number }[];
  grading: { shadow: [number, number]; highlight: [number, number] } | null;
  grain: number;
  /** Schwarzweiß (ConvertToGrayscale) */
  gray: boolean;
};

const BASICS: [string, string, string?][] = [
  ["Exposure2012", de("Belichtung"), "EV"],
  ["Contrast2012", de("Kontrast")],
  ["Highlights2012", de("Lichter")],
  ["Shadows2012", de("Tiefen")],
  ["Whites2012", de("Weiß")],
  ["Blacks2012", de("Schwarz")],
  ["Texture", de("Struktur")],
  ["Clarity2012", de("Klarheit")],
  ["Dehaze", de("Dunst entfernen")],
  ["Vibrance", de("Dynamik")],
  ["Saturation", de("Sättigung")],
];
const COLORS: [string, string][] = [
  ["Red", de("Rot")],
  ["Orange", "Orange"],
  ["Yellow", de("Gelb")],
  ["Green", de("Grün")],
  ["Aqua", de("Aquamarin")],
  ["Blue", de("Blau")],
  ["Purple", de("Lila")],
  ["Magenta", "Magenta"],
];

/** Wert eines crs-Attributs (crs:Name="…") oder Elements (<crs:Name>…</crs:Name>) */
function attr(xmp: string, name: string): string | undefined {
  const a = xmp.match(new RegExp(`crs:${name}="([^"]*)"`));
  if (a) return a[1];
  const e = xmp.match(new RegExp(`<crs:${name}>([^<]*)</crs:${name}>`));
  return e?.[1];
}
export const num = (xmp: string, name: string) => {
  const v = attr(xmp, name);
  return v === undefined ? undefined : Number(v);
};

export function parseXmp(xmp: string): LightroomSettings | null {
  if (!xmp.includes("camera-raw-settings")) return null;
  const nameEl = xmp.match(/<crs:Name>\s*<rdf:Alt>\s*<rdf:li[^>]*>([^<]*)</);
  const basics = BASICS.flatMap(([key, label, unit]) => {
    const value = num(xmp, key);
    return value === undefined || Number.isNaN(value) ? [] : [{ key, label, value, unit }];
  });
  const curveBlock = xmp.match(/<crs:ToneCurvePV2012>([\s\S]*?)<\/crs:ToneCurvePV2012>/)?.[1] ?? "";
  const curve = [...curveBlock.matchAll(/<rdf:li>\s*(\d+)\s*,\s*(\d+)\s*<\/rdf:li>/g)].map(
    (m) => [Number(m[1]), Number(m[2])] as [number, number],
  );
  const hsl = COLORS.map(([en, label]) => ({
    color: label,
    hue: num(xmp, `HueAdjustment${en}`) ?? 0,
    sat: num(xmp, `SaturationAdjustment${en}`) ?? 0,
    lum: num(xmp, `LuminanceAdjustment${en}`) ?? 0,
  }));
  const sh = num(xmp, "ColorGradeShadowHue");
  const hh = num(xmp, "ColorGradeHighlightHue");
  return {
    name: nameEl?.[1] ?? attr(xmp, "Name"),
    basics,
    curve: curve.length >= 2 ? curve : [[0, 0], [255, 255]],
    hsl,
    grading:
      sh !== undefined || hh !== undefined
        ? {
            shadow: [sh ?? 0, num(xmp, "ColorGradeShadowSat") ?? 0],
            highlight: [hh ?? 0, num(xmp, "ColorGradeHighlightSat") ?? 0],
          }
        : null,
    grain: num(xmp, "GrainAmount") ?? 0,
    gray: /^true$/i.test(attr(xmp, "ConvertToGrayscale") ?? ""),
  };
}

// Was nicht in ein Preset gehört: bildbezogene Werte (Zuschnitt, Masken, Retusche, Objektiv, absoluter Weißabgleich).
// Schwarzweiß (ConvertToGrayscale) bleibt drin, sonst wird ein SW-Preset farbig.
const SKIP = /^(Crop|HasCrop|AlreadyApplied|RawFileName|Version|ProcessVersion|WhiteBalance|Temperature|Tint|Lens|Perspective|Upright|AutoLateralCA|Defringe|VignetteAmount|VignetteMidpoint|HasSettings|PresetType|UUID|Name|Cluster|Supports|Requires|ToneMapStrength|CameraProfileDigest|Retouch|RedEye|Mask|Paint|Gradient|Circular|OverrideLookVignette|DepthBasedCorrections)/;

/** Ein importierbares Lightroom-Preset (.xmp) aus den globalen crs:-Werten eines Fotos */
export function toPreset(xmp: string, name: string): string {
  const attrs = [...xmp.matchAll(/crs:([A-Za-z0-9]+)="([^"]*)"/g)]
    .filter(([, k]) => !SKIP.test(k))
    .map(([, k, v]) => `crs:${k}="${v}"`);
  const curves = [...xmp.matchAll(/<crs:(ToneCurvePV2012(?:Red|Green|Blue)?)>[\s\S]*?<\/crs:\1>/g)].map((m) => m[0]);
  const esc = name.replace(/[<>&"]/g, "");
  const uuid = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal" crs:UUID="${uuid}" crs:SupportsAmount="False" crs:SupportsColor="True"
   crs:SupportsMonochrome="True" crs:SupportsHighDynamicRange="True" crs:SupportsNormalDynamicRange="True"
   crs:SupportsSceneReferred="True" crs:SupportsOutputReferred="True" crs:HasSettings="True"
   crs:ProcessVersion="15.4" ${attrs.join(" ")}>
   <crs:Name><rdf:Alt><rdf:li xml:lang="x-default">${esc}</rdf:li></rdf:Alt></crs:Name>
   <crs:Group><rdf:Alt><rdf:li xml:lang="x-default">Calima</rdf:li></rdf:Alt></crs:Group>
   ${curves.join("\n   ")}
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
`;
}

/* ---------- Calimas eigener Block: die kopierbaren Einstellungen, damit ein gesichertes Foto sein Rezept behält ---------- */

const NS = "https://calima.web.app/ns/1.0/";
const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unescapeXml = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/**
 * XMP-Paket mit `calima:settings` (JSON der Einstellungen, wie sie die Zwischenablage hält) und `calima:name`.
 * Liegt neben den Aufnahmedaten in der gesicherten Datei; beim Öffnen liest readMeta es als Rezept „Calima-Look“.
 */
export function calimaXmp(settings: { name: string; source: string } & Record<string, unknown>): string {
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:calima="${NS}" calima:version="1" calima:source="${escapeXml(settings.source)}">
   <calima:name>${escapeXml(settings.name)}</calima:name>
   <calima:settings>${escapeXml(JSON.stringify(settings))}</calima:settings>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/** Die Einstellungen aus einem XMP-Block zurück, ungeprüft (cleanSettings prüft sie) */
export function parseCalimaXmp(xmp: string): unknown {
  if (!xmp.includes(NS)) return null;
  const m = xmp.match(/<calima:settings>([\s\S]*?)<\/calima:settings>/);
  if (!m) return null;
  try {
    return JSON.parse(unescapeXml(m[1]));
  } catch {
    return null;
  }
}
