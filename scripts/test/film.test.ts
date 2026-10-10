// Beiseitegelegte Filme in der Look-Leiste (#226): ab zwei liegen sie als ein Stapel vor den Looks.
import assert from "node:assert/strict";
import { test } from "node:test";

import { filmStrip, type Film } from "@/lib/film";

const film = (stack: string): Film => ({ stack, name: stack, approx: false, edit: null, count: 3 });

test("kein oder ein beiseitegelegter Film: wie bisher einzeln, kein Stapel", () => {
  assert.deepEqual(filmStrip([], false), { pile: null, films: [] });
  const one = [film("a")];
  assert.deepEqual(filmStrip(one, false), { pile: null, films: one });
});

test("ab zwei Filmen ein Stapel; zu zeigt er keine Filme, offen alle", () => {
  const five = ["a", "b", "c", "d", "e"].map(film);
  assert.deepEqual(filmStrip(five, false), { pile: 5, films: [] });
  assert.deepEqual(filmStrip(five, true), { pile: 5, films: five });
});
