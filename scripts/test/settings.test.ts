// Fuji-Leser, Lightroom-Übersetzung und Einstellungen kopieren, mit künstlichen Dateien (fixtures.mjs).
import assert from "node:assert/strict";
import { test } from "node:test";

import exifr from "exifr";

import { readFujiRecipe } from "@/lib/fuji";
import { applySettings, cleanSettings, fromEdit, fromFuji, fromLightroom, thinCurve } from "@/lib/develop/settings";
import { neutralEdit, PRESETS } from "@/lib/develop/model";
import { parseXmp, toPreset } from "@/lib/xmp";
import { CLASSIC_CHROME, dng, fujiNote, jpeg, LR_XMP } from "./fixtures.mjs";

const note = fujiNote(CLASSIC_CHROME);
const meta = (buf: Uint8Array) => exifr.parse(Buffer.from(buf), { pick: ["Make", "ISO", "MakerNote"], makerNote: true });

test("Fuji-Rezept aus JPEG und aus DNG", async () => {
  for (const file of [jpeg({ note }), dng({ note })]) {
    const m = await meta(file);
    assert.ok(m.makerNote instanceof Uint8Array, "MakerNote kommt roh mit");
    const r = readFujiRecipe(m.makerNote, { iso: m.ISO, ev: 1 / 3 })!;
    assert.equal(r.film, "Classic Chrome");
    assert.equal(r.dr, "DR400");
    assert.deepEqual(r.wb, { mode: "Auto", r: 2, b: -4 });
    assert.equal(r.highlight, -1);
    assert.equal(r.shadow, 1);
    assert.equal(r.color, 2);
    assert.equal(r.sharpness, -1);
    assert.equal(r.nr, -4);
    assert.deepEqual(r.grain, { strength: 1, size: "klein" });
    assert.equal(r.colorChrome, 2);
    assert.equal(r.fxBlue, 1);
    assert.equal(r.ev, "+1/3");
  }
  // DR Auto: der angewandte Wert steht trotzdem drin und wird übernommen
  const auto = readFujiRecipe(fujiNote({ ...CLASSIC_CHROME, 0x1402: [3, [0]] }), {})!;
  assert.equal(auto.dr, "DR Auto (DR400)");
  assert.equal(fromFuji(auto)!.rec.dr, 400);
});

test("kaputte MakerNote kostet nur das Rezept", () => {
  for (const cut of [8, 14, 30, 60, note.length - 20]) assert.equal(readFujiRecipe(note.slice(0, cut), {}), null);
  const wrong = note.slice();
  wrong[13] = 0xff; // Versatz des IFD zeigt ins Leere
  assert.equal(readFujiRecipe(wrong, {}), null);
  assert.equal(readFujiRecipe(new TextEncoder().encode("Apple iOS\0\0\x01MM"), {}), null);
});

test("XMP aus JPEG und DNG, Schwarzweiß bleibt im Preset", async () => {
  for (const file of [jpeg({ xmp: LR_XMP }), dng({ xmp: LR_XMP })]) {
    const x = await exifr.parse(Buffer.from(file), { tiff: false, xmp: { parse: false } });
    assert.match(x.xmp, /camera-raw-settings/);
  }
  const gray = LR_XMP.replace('ConvertToGrayscale="False"', 'ConvertToGrayscale="True"');
  assert.equal(parseXmp(gray)!.gray, true);
  assert.match(toPreset(gray, "SW"), /crs:ConvertToGrayscale="True"/);
});

test("Fuji → Calima: Werte 1:1, Film als Anmutung, Verlorenes benannt", () => {
  const r = readFujiRecipe(note, {})!;
  const s = fromFuji(r, "Tafel 7")!;
  assert.equal(s.approx, true);
  assert.deepEqual(s.rec, { film: "kreide", wbR: 2, wbB: -4, hl: -1, sh: 1, color: 2, dr: 400, cc: 2, fxb: 1, grain: 1, gsize: "klein" });
  assert.deepEqual(s.lost, ["Schärfe", "Rauschminderung"]);
  assert.equal(fromFuji({ ...r, film: "Acros + Rotfilter", color: 0 })!.rec.film, "kohle");
  assert.equal(fromFuji({ ...r, placeholder: true }), null, "Beispiel-Rezepte sind nicht kopierbar");
  assert.equal(fromFuji({ ...r, film: "Film 0xc00" })!.lost[0], "Filmsimulation Film 0xc00");
});

test("Lightroom → Calima", () => {
  const s = fromLightroom(LR_XMP, "Japan warm")!;
  assert.equal(s.f.exposure, 0.5);
  assert.equal(s.f.contrast, 0.2);
  assert.equal(s.f.shadows, 0.3);
  assert.equal(s.f.warmth, 0.15);
  assert.equal(s.f.sat, -0.1);
  assert.equal(s.f.more!.highlights, -0.4);
  assert.equal(s.f.more!.blacks, -0.15);
  assert.equal(s.f.more!.tint, -0.05);
  assert.equal(s.f.more!.vignette, -0.2);
  assert.deepEqual(s.f.more!.hsl[1], [-0.06, 0, 0]);
  assert.deepEqual(s.f.more!.hsl[5], [0, -0.3, 0]);
  assert.equal(s.f.more!.curve.length, 5);
  assert.deepEqual(s.f.more!.curve[0], [0, 12 / 255]);
  assert.equal(s.rec.grain, 1);
  const gray = fromLightroom(LR_XMP.replace('ConvertToGrayscale="False"', 'ConvertToGrayscale="True"'), "SW")!;
  assert.equal(gray.f.look, "kohle");
});

test("Kurve wird auf acht Punkte mit Abstand ausgedünnt", () => {
  const dense = Array.from({ length: 30 }, (_, i) => [Math.round((i * 255) / 29), Math.round((i * 255) / 29) ** 1.02 % 256] as [number, number]);
  const c = thinCurve(dense);
  assert.ok(c.length <= 8);
  assert.equal(c[0][0], 0);
  assert.equal(c[c.length - 1][0], 1);
  for (let i = 1; i < c.length; i++) assert.ok(c[i][0] - c[i - 1][0] >= 0.04);
});

test("Einfügen ersetzt Farbe und Licht, Zuschnitt bleibt, Auto fällt weg", () => {
  const src = { ...neutralEdit(), exposure: 0.3, look: "salz" as const, amount: 0.6, levels: [0.02, 0.97] as [number, number], origin: "auto" as const, rec: { ...PRESETS[0].v }, recName: "Sommerlicht" };
  const copied = fromEdit(src, undefined, "Tafel 3")!;
  assert.equal(copied.name, "Sommerlicht");
  const geo = { rot: 90 } as never;
  const target = { ...neutralEdit(), contrast: 0.5, geo, origin: "pick" as const, pick: "klar" as const, levels: [0.1, 0.9] as [number, number] };
  const out = applySettings(target, copied);
  assert.equal(out.exposure, 0.3);
  assert.equal(out.contrast, 0, "Feinschliff des Ziels wird ersetzt");
  assert.equal(out.look, "salz");
  assert.equal(out.levels, null);
  assert.equal(out.origin, null);
  assert.equal(out.pick, undefined);
  assert.equal(out.geo, geo);
  assert.deepEqual(out.rec, PRESETS[0].v);
  assert.equal(fromEdit({ ...neutralEdit(), levels: [0.02, 0.97], origin: "auto" }), null, "nur Auto gibt nichts zum Mitnehmen");
});

test("Zwischenablage aus dem Speicher wird geprüft", () => {
  const s = fromFuji(readFujiRecipe(note, {})!)!;
  assert.deepEqual(JSON.parse(JSON.stringify(cleanSettings(JSON.parse(JSON.stringify(s))))), JSON.parse(JSON.stringify(s)));
  assert.equal(cleanSettings({ v: 2 }), null);
  const evil = cleanSettings({ ...s, rec: { ...s.rec, wbR: 99, film: "<script>" }, f: { exposure: 50 } })!;
  assert.equal(evil.rec.wbR, 9);
  assert.equal(evil.rec.film, null);
  assert.equal(evil.f.exposure, 1);
});
