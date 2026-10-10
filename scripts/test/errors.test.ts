// Eine Fehlermeldung steht nur einmal da (#300): ohne genauere Ursache keine Klammer mit einem zweiten Allgemeinplatz.
import assert from "node:assert/strict";
import { test } from "node:test";

import { errorDetail } from "@/lib/errors";

test("bekannte Firebase-Fehler bekommen ihren Satz", () => {
  assert.match(errorDetail({ code: "unavailable" }) ?? "", /Keine Verbindung/);
});

test("eigene Meldungen ohne Code bleiben", () => {
  assert.equal(errorDetail(new Error("Das Foto liegt nicht mehr auf diesem Gerät.")), "Das Foto liegt nicht mehr auf diesem Gerät.");
});

test("unbekannte Fehler haben keine Einzelheit", () => {
  assert.equal(errorDetail({ code: "invalid-argument", message: "Nested arrays are not supported" }), null);
  assert.equal(errorDetail("kaputt"), null);
  assert.equal(errorDetail(Object.assign(new Error("x"), { code: 0 })), null);
});
