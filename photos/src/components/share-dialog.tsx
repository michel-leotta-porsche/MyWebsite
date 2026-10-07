"use client";

import { useEffect, useState } from "react";

import { inputClass, SlipDialog } from "@/components/app-ui";
import { mySharesOf, notesOf, shareBook, unshare, type Note, type Share, type StoredBook } from "@/lib/store";

const linkFor = (token: string) => `${location.origin}/b?t=${token}`;

/** „Hinlegen für …“: persönlicher Link pro Person, einzeln zurückziehbar; darunter Zettel und Eselsohren */
export function ShareDialog({ book, onClose }: { book: StoredBook; onClose: () => void }) {
  const [to, setTo] = useState("");
  const [shares, setShares] = useState<Share[] | null>(null);
  const [notes, setNotes] = useState<Record<string, Note[]>>({});
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    mySharesOf(book.owner)
      .then(async (all) => {
        const mine = all.filter((s) => s.book.id === book.id);
        if (!alive) return;
        setShares(mine);
        const entries = await Promise.all(mine.map(async (s) => [s.token, await notesOf(s.token).catch(() => [])] as const));
        if (alive) setNotes(Object.fromEntries(entries));
      })
      .catch(() => alive && setShares([]));
    return () => {
      alive = false;
    };
  }, [book.id, book.owner]);

  const create = async () => {
    if (!to.trim()) return;
    setBusy(true);
    try {
      const token = await shareBook(book, to.trim());
      setShares((s) => [{ token, owner: book.owner, fromName: book.ownerName, to: to.trim(), book }, ...(s ?? [])]);
      setTo("");
      const url = linkFor(token);
      // auf dem Telefon gleich das Teilen-Menü (WhatsApp, Nachrichten …)
      if (navigator.share) navigator.share({ title: book.title, text: `Für ${to.trim()}`, url }).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(linkFor(token)).catch(() => {});
    setCopied(token);
    window.setTimeout(() => setCopied(null), 1600);
  };

  return (
    <SlipDialog label={`„${book.title || "Ohne Titel"}“ hinlegen`} onClose={onClose}>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <label className="sr-only" htmlFor="share-to">
          Für wen
        </label>
        <input
          id="share-to"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Für wen? z. B. Lena"
          className={inputClass}
          maxLength={40}
        />
        <button
          type="submit"
          disabled={busy || !to.trim()}
          className="border-ink text-ink hover:bg-ink hover:text-paper shrink-0 border px-3 text-sm font-semibold transition-colors duration-150 disabled:opacity-50"
        >
          Hinlegen
        </button>
      </form>
      <p className="text-ink-2 mt-2 text-[13px]">Jede Person bekommt einen eigenen Link, ohne Konto. Der Link zeigt dieses Buch und sonst nichts.</p>

      <ul className="mt-5 space-y-4">
        {shares === null && <li className="text-ink-2 text-sm">Lade …</li>}
        {shares?.map((s) => (
          <li key={s.token} className="border-t border-ink/15 pt-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold">Für {s.to}</p>
              <span className="flex gap-3 text-sm">
                <button type="button" onClick={() => copy(s.token)} className="underline decoration-mark decoration-2 underline-offset-4">
                  {copied === s.token ? "Kopiert" : "Link kopieren"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await unshare(s.token).catch(() => {});
                    setShares((all) => all?.filter((x) => x.token !== s.token) ?? null);
                  }}
                  className="text-ink-2 underline underline-offset-4"
                >
                  Zurückziehen
                </button>
              </span>
            </div>
            {(notes[s.token] ?? []).map((n) => (
              <p key={n.id} className="text-ink-2 mt-1 text-[13px]">
                {n.kind === "ear" ? `Eselsohr bei Tafel ${n.no}` : `„${n.text}“`}
                {n.from ? ` · ${n.from}` : ""}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </SlipDialog>
  );
}
