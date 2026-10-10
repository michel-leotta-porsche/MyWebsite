// saveBook selbst (#287), im Testmodus ohne Firebase: zwei Geräte speichern auf demselben Stand, das zweite wird abgewiesen.
import assert from "node:assert/strict";
import { test } from "node:test";

process.env.NEXT_PUBLIC_FUJI_MOCK = "1";
const { saveBook, loadBook, SCHEMA } = await import("@/lib/store");
const { BookConflict } = await import("@/lib/book-rev");

const book = { schema: SCHEMA, id: "sb1", owner: "u1", ownerName: "Michel", title: "Lanzarote", subtitle: "", cloth: "ringelblume" as const, aspect: 4 / 3, coverKey: "", photos: [], spreads: [] };

test("zwei Speicherungen auf demselben Stand: die zweite wirft BookConflict und lässt die erste stehen", async () => {
  const first = await saveBook(book);
  const iphone = await saveBook({ ...first, subtitle: "Tag 1" }, first.rev);
  await assert.rejects(saveBook({ ...first, title: "Mac" }, first.rev), (e: unknown) => e instanceof BookConflict && e.current.rev === iphone.rev);
  const now = await loadBook("sb1");
  assert.equal(now?.subtitle, "Tag 1");
  assert.equal(now?.title, "Lanzarote");
});
