// Der Calima-Look in der Datei: XMP schreiben, in ein JPEG setzen, mit exifr wieder lesen und als Rezept erkennen.
import assert from "node:assert/strict";
import { test } from "node:test";

import exifr from "exifr";

import { applySettings, cleanSettings, fromEdit } from "@/lib/develop/settings";
import { withXmp } from "@/lib/exif-write";
import { neutralEdit, PRESETS } from "@/lib/develop/model";
import { fmtDuration, fmtFocus, ISO_STOPS, nearest, realFocals, SHUTTER_STOPS } from "@/lib/camera";
import { calimaXmp, parseCalimaXmp } from "@/lib/xmp";
import { jpeg, LR_XMP } from "./fixtures.mjs";

const look = { ...neutralEdit(), rec: { ...PRESETS[0].v, color: 2 }, recName: "Sommerlicht, wärmer" };
const readXmp = async (blob: Blob) => {
  const x = await exifr.parse(Buffer.from(await blob.arrayBuffer()), { tiff: false, xmp: { parse: false } });
  return typeof x?.xmp === "string" ? x.xmp : undefined;
};

test("Look hin und zurück: Datei → Rezept → dieselben Regler", async () => {
  const s = fromEdit(look, look.recName)!;
  assert.ok(s, "aus dem Look werden Einstellungen");
  const file = await withXmp(new Blob([jpeg()]), calimaXmp(s));
  const xmp = await readXmp(file);
  assert.ok(xmp?.includes("calima:settings"), "der XMP-Block liegt in der Datei");
  const back = cleanSettings(parseCalimaXmp(xmp!));
  assert.ok(back, "die Einstellungen lassen sich wieder lesen");
  assert.equal(back.name, "Sommerlicht, wärmer");
  assert.equal(back.approx, false);
  const e = applySettings(neutralEdit(), back);
  assert.deepEqual(e.rec, look.rec);
  assert.equal(e.recName, look.recName);
});

test("ein alter XMP-Block weicht dem neuen, Exif bleibt", async () => {
  const s = fromEdit(look)!;
  const file = await withXmp(new Blob([jpeg({ xmp: LR_XMP })]), calimaXmp(s));
  const buf = new Uint8Array(await file.arrayBuffer());
  assert.equal(buf[0], 0xff);
  assert.equal(buf[1], 0xd8);
  const text = new TextDecoder("latin1").decode(buf);
  assert.equal(text.split("http://ns.adobe.com/xap/1.0/").length, 2, "genau ein XMP-Block");
  assert.ok(text.includes("Exif\0\0"), "Exif-Block noch vorn");
  assert.ok(!text.includes("crs:"), "der Lightroom-Block ist weg");
  assert.ok(text.includes("calima:settings"));
});

test("fremde oder kaputte Blöcke ergeben kein Rezept", () => {
  assert.equal(parseCalimaXmp(LR_XMP), null);
  assert.equal(parseCalimaXmp("<calima:settings>{kaputt</calima:settings>"), null);
  assert.equal(cleanSettings(parseCalimaXmp("<calima:settings>{&quot;v&quot;:1}</calima:settings>")), null);
});

// Expertenmodus E1: Reihen und Beschriftungen der Räder
test("Zeiten lesbar und in Drittelstufen", () => {
  assert.equal(fmtDuration(1 / 250), "1/250");
  assert.equal(fmtDuration(1 / 8000), "1/8000");
  assert.equal(fmtDuration(0.5), "0,5 s");
  assert.equal(fmtDuration(1), "1 s");
  assert.equal(SHUTTER_STOPS[0] < 1 / 8000, true);
  assert.equal(SHUTTER_STOPS.at(-1), 1);
  assert.equal(nearest(SHUTTER_STOPS, 1 / 1000) > 1 / 1100 && nearest(SHUTTER_STOPS, 1 / 1000) < 1 / 900, true);
  assert.equal(nearest(ISO_STOPS, 90), 100);
  // Umschaltpunkte eines iPhone 15 Pro Max: 0,5× Ultraweit, 1× Haupt, 5× Tele
  assert.deepEqual(realFocals([0.5, 1, 5]), [13, 24, 120]);
  assert.deepEqual(realFocals([1]), [24]);
});

test("Fokus als Skala nah … ∞, nie in Prozent (#225)", () => {
  assert.equal(fmtFocus(0), "nah|Fokus");
  assert.equal(fmtFocus(0.45), "Tisch|Fokus");
  assert.equal(fmtFocus(0.7), "Zimmer|Fokus");
  assert.equal(fmtFocus(0.88), "Straße|Fokus");
  assert.equal(fmtFocus(0.95), "∞");
  assert.equal(fmtFocus(1), "∞");
  for (let f = 0; f <= 1; f += 0.01) assert.ok(!fmtFocus(f).includes("%"), `kein Prozent bei ${f}`);
});
