// Künstliche Testdateien: kleine JPEGs und TIFFs (wie DNG) mit Exif, Fuji-MakerNote und XMP.
// Keine echten Bilddaten; es geht nur um die Metadaten.

/** IFD in little endian: entries [tag, type, count, value(bytes oder Zahl)] ab Versatz `at` (relativ zu `base`) */
function ifd(entries, at) {
  const sizes = { 1: 1, 2: 1, 3: 2, 4: 4, 7: 1, 9: 4 };
  const list = [...entries]
    .sort((a, b) => a.tag - b.tag)
    .map((e) => {
      if (e.bytes) return { ...e, count: e.bytes.length };
      const b = new Uint8Array(sizes[e.type] * e.values.length);
      const bv = new DataView(b.buffer);
      e.values.forEach((x, j) => (e.type === 3 ? bv.setUint16(j * 2, x, true) : e.type === 9 ? bv.setInt32(j * 4, x, true) : bv.setUint32(j * 4, x, true)));
      return { ...e, bytes: b, count: e.values.length };
    });
  const head = 2 + list.length * 12 + 4;
  const out = new Uint8Array(head + list.reduce((n, e) => n + (e.bytes.length > 4 ? e.bytes.length + (e.bytes.length & 1) : 0), 0));
  const v = new DataView(out.buffer);
  v.setUint16(0, list.length, true);
  let extra = head;
  list.forEach((e, i) => {
    const p = 2 + i * 12;
    v.setUint16(p, e.tag, true);
    v.setUint16(p + 2, e.type, true);
    v.setUint32(p + 4, e.count, true);
    if (e.bytes.length <= 4) out.set(e.bytes, p + 8);
    else {
      v.setUint32(p + 8, at + extra, true);
      out.set(e.bytes, extra);
      extra += e.bytes.length + (e.bytes.length & 1);
    }
  });
  return out;
}
const ascii = (s) => new TextEncoder().encode(s + "\0");
const cat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

/** Fuji-MakerNote: "FUJIFILM", Versatz 12, dann das IFD; Versätze zählen ab Beginn der MakerNote */
export function fujiNote(tags) {
  const entries = Object.entries(tags).map(([tag, [type, values]]) => ({ tag: Number(tag), type, values }));
  const head = cat(new TextEncoder().encode("FUJIFILM"), new Uint8Array([12, 0, 0, 0]));
  return cat(head, ifd(entries, 12));
}

/** TIFF-Block (II*) mit IFD0 (Make, Model, optional XMP) und Exif-IFD (Zeit, Blende, ISO, MakerNote) */
export function tiff({ make = "FUJIFILM", model = "X-T5", note, xmp, ifd0Extra = [] } = {}) {
  const xmpBytes = xmp ? new TextEncoder().encode(xmp) : null;
  const build = (exifAt) => {
    const e0 = [
      { tag: 0x010f, type: 2, bytes: ascii(make) },
      { tag: 0x0110, type: 2, bytes: ascii(model) },
      { tag: 0x8769, type: 4, values: [exifAt] },
      ...(xmpBytes ? [{ tag: 700, type: 1, bytes: xmpBytes }] : []),
      ...ifd0Extra,
    ];
    return ifd(e0, 8);
  };
  // zweimal bauen: erst die Länge von IFD0 kennen, dann den Versatz des Exif-IFD eintragen
  const exifAt = 8 + build(0).length;
  const i0 = build(exifAt);
  const ex = ifd(
    [
      { tag: 0xa405, type: 3, values: [35] },
      { tag: 0x8827, type: 3, values: [400] },
      ...(note ? [{ tag: 0x927c, type: 7, bytes: note }] : []),
    ],
    exifAt,
  );
  const head = new Uint8Array([0x49, 0x49, 42, 0, 8, 0, 0, 0]);
  return cat(head, i0, ex);
}

const seg = (marker, body) => cat(new Uint8Array([0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 255]), body);

/** JPEG ohne Bild: SOI, APP1 Exif, optional APP1 XMP, EOI */
export function jpeg({ note, xmp, make, model } = {}) {
  const exif = seg(0xe1, cat(new TextEncoder().encode("Exif\0\0"), tiff({ make, model, note })));
  const x = xmp ? seg(0xe1, cat(new TextEncoder().encode("http://ns.adobe.com/xap/1.0/\0"), new TextEncoder().encode(xmp))) : new Uint8Array();
  return cat(new Uint8Array([0xff, 0xd8]), exif, x, new Uint8Array([0xff, 0xd9]));
}

/** wie eine DNG: TIFF mit MakerNote im Exif-IFD und XMP in IFD0 (Tag 700) */
export const dng = ({ note, xmp, make, model } = {}) => tiff({ note, xmp, make, model });

/** Classic Chrome, DR400, Lichter −1, Schatten +1, Farbe +2, WB R+2 B−4, Körnung schwach klein, CC stark, FXB schwach */
export const CLASSIC_CHROME = {
  0x1001: [3, [0x82]], // Schärfe −1
  0x1002: [3, [0x0]], // WB Auto
  0x1003: [3, [0x100]], // Farbe +2
  0x100a: [9, [40, -80]], // WB-Feinabstimmung R+2 B−4 (20er-Schritte)
  0x100e: [3, [0x2e0]], // NR −4
  0x1040: [9, [-16]], // Schatten +1
  0x1041: [9, [16]], // Lichter −1
  0x1047: [9, [32]], // Körnung schwach
  0x1048: [9, [64]], // Color Chrome stark
  0x104c: [3, [16]], // Körnung klein
  0x104e: [9, [32]], // FX Blau schwach
  0x1401: [3, [0x600]], // Classic Chrome
  0x1402: [3, [1]],
  0x1403: [3, [400]],
};

export const LR_XMP = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
 crs:Exposure2012="+0.50" crs:Contrast2012="+20" crs:Highlights2012="-40" crs:Shadows2012="+30" crs:Whites2012="+10" crs:Blacks2012="-15"
 crs:Clarity2012="+12" crs:Vibrance="+25" crs:Saturation="-10" crs:IncrementalTemperature="+15" crs:IncrementalTint="-5"
 crs:HueAdjustmentOrange="-6" crs:SaturationAdjustmentBlue="-30" crs:LuminanceAdjustmentGreen="+10"
 crs:PostCropVignetteAmount="-20" crs:GrainAmount="25" crs:GrainSize="25" crs:ConvertToGrayscale="False">
 <crs:Name><rdf:Alt><rdf:li xml:lang="x-default">Japan warm</rdf:li></rdf:Alt></crs:Name>
 <crs:ToneCurvePV2012><rdf:Seq><rdf:li>0, 12</rdf:li><rdf:li>64, 60</rdf:li><rdf:li>128, 132</rdf:li><rdf:li>192, 200</rdf:li><rdf:li>255, 250</rdf:li></rdf:Seq></crs:ToneCurvePV2012>
</rdf:Description></rdf:RDF></x:xmpmeta>`;
