"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { inputClass, linkClass, RequireUser, RoomNav, RoomTitle, SlipDialog, TextButton } from "@/components/app-ui";
import { OPERATOR } from "@/components/legal";
import { confirmIdentity, deleteAccountUser, providerOf, renameUser, signOutNow, type AppleRevoke, type User } from "@/lib/firebase";
import { friendlyError, signInError } from "@/lib/errors";
import { setSessionHint } from "@/lib/session-hint";
import { isAdmin } from "@/lib/admin";
import {
  closeReport,
  deleteAccountData,
  inbox,
  myBooks,
  mySharesOf,
  openReports,
  REPORT_REASONS,
  takeDownShare,
  unblockSender,
  watchBlocked,
  type Blocked,
  type Report,
  type Share,
  type StoredBook,
} from "@/lib/store";

/** Profil: wer angemeldet ist, was auf den Tischen liegt, welche Links draußen sind */
export function Profile() {
  return (
    <RequireUser title="Dein Profil" text="Melde dich an, dann siehst du hier deine Bücher, deine geteilten Links und dein Konto.">
      {(user) => <Card user={user} />}
    </RequireUser>
  );
}

const PROVIDER_NAMES = { "google.com": "Google", "apple.com": "Apple" } as const;

const since = (user: User) => {
  const t = user.metadata?.creationTime;
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
};

function Card({ user }: { user: User }) {
  const router = useRouter();
  const [own, setOwn] = useState<StoredBook[] | null>(null);
  const [shares, setShares] = useState<Share[] | null>(null);
  const [gifts, setGifts] = useState<Share[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(user.displayName);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  useEffect(() => watchBlocked(user.uid, setBlocked), [user.uid]);

  useEffect(() => {
    let alive = true;
    Promise.all([myBooks(user.uid), mySharesOf(user.uid), inbox(user.uid)])
      .then(([b, s, g]) => {
        if (!alive) return;
        setOwn(b);
        setShares(s);
        setGifts(g);
      })
      .catch((e) => alive && setError(friendlyError(e)));
    return () => {
      alive = false;
    };
  }, [user.uid]);

  const books = own?.filter((b) => !b.trashed);
  const photos = books?.reduce((n, b) => n + b.photos.filter((p) => !p.shelved).length, 0);
  const titleOf = new Map((own ?? []).map((b) => [b.id, b.title || "Ohne Titel"]));
  const stats = [
    { label: "Eigene Bücher", value: books?.length, href: "/zimmer#von-dir" },
    { label: "Fotos darin", value: photos, href: "/zimmer#von-dir" },
    { label: "Hingelegt", value: shares?.length, href: "#hingelegt" },
    { label: "Für dich", value: gifts?.length, href: "/zimmer" },
  ];
  const joined = since(user);

  return (
    <main className="linen table-surface relative flex min-h-svh flex-col bg-table">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-8 md:pt-6">
        <RoomTitle>Profil</RoomTitle>
        <RoomNav />
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pt-14 pb-20 md:px-8 md:pt-20">
        <p className="text-on-table text-4xl leading-[0.95] font-bold tracking-[-0.03em] md:text-6xl" style={{ fontVariationSettings: '"wdth" 78, "opsz" 72' }}>
          {name ?? "Ohne Namen"}
        </p>
        <p className="text-on-table-2 mt-3 text-base">
          {user.email}
          {joined && <> · dabei seit {joined}</>}
        </p>

        <dl className="mt-12 grid grid-cols-2 gap-px bg-on-table-2/25 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-table">
              <Link href={s.href} className="group block px-1 py-5 md:px-4">
                <dt className="text-on-table-2 text-sm">{s.label}</dt>
                <dd className="text-on-table mt-1 text-4xl font-semibold tracking-[-0.02em]">
                  {s.value ?? <span className="text-on-table-2">–</span>}
                </dd>
                <span aria-hidden className="mt-3 block h-[2px] w-full origin-left scale-x-0 bg-mark transition-transform duration-500 ease-out group-hover:scale-x-100" />
              </Link>
            </div>
          ))}
        </dl>

        {error && (
          <p role="alert" className="text-on-table mt-6 text-sm">
            Konnte nicht alles laden: {error}
          </p>
        )}

        <section id="hingelegt" aria-labelledby="hingelegt-h" className="mt-16 scroll-mt-8">
          <h2 id="hingelegt-h" className="text-on-table text-xl font-semibold tracking-[-0.01em]">
            Hingelegt für
          </h2>
          {shares && shares.length === 0 && (
            <p className="text-on-table-2 mt-3 text-base">
              Noch niemand. Im Bücherzimmer legst du ein Buch über „Mehr …“ und „Hinlegen für …“ einem Freund hin.
            </p>
          )}
          {shares && shares.length > 0 && (
            <ul className="mt-4 border-t border-on-table-2/40">
              {shares.map((s) => (
                <li key={s.token} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-on-table-2/25 py-3 text-base">
                  <span className="min-w-0">
                    <span className="text-on-table">{s.to}</span>
                    <span className="text-on-table-2"> · {titleOf.get(s.bookId ?? s.book?.id) ?? s.book?.title ?? "Ohne Titel"}</span>
                    {s.paused && <span className="text-on-table-2"> · ruht, Buch im Papierkorb</span>}
                  </span>
                  {!s.paused && (
                    <Link href={`/b?t=${s.token}`} className={`${linkClass} text-sm`}>
                      Ansehen wie {s.to}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="konto-h" className="mt-16">
          <h2 id="konto-h" className="text-on-table text-xl font-semibold tracking-[-0.01em]">
            Konto
          </h2>
          <p className="text-on-table-2 mt-3 max-w-xl text-base leading-relaxed">
            Angemeldet über {PROVIDER_NAMES[providerOf(user)]}. Deine Bücher sieht nur, wem du einen Link gibst. Ein Buch sicherst du beim Bearbeiten unter „Verlauf“ als Datei.
          </p>
          <p className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <TextButton onClick={() => setRenaming(true)}>Name ändern …</TextButton>
            <TextButton onClick={() => signOutNow().then(() => router.push("/"))}>Abmelden</TextButton>
            <TextButton className="text-on-table-2" onClick={() => setDeleting(true)}>
              Konto löschen …
            </TextButton>
          </p>
        </section>

        {blocked.length > 0 && (
          <section aria-labelledby="blocked-h" className="mt-16">
            <h2 id="blocked-h" className="text-on-table text-xl font-semibold tracking-[-0.01em]">
              Ausgeblendet
            </h2>
            <p className="text-on-table-2 mt-3 max-w-xl text-base">Bücher dieser Personen landen nicht mehr in deinem Bücherzimmer.</p>
            <ul className="mt-4 border-t border-on-table-2/40">
              {blocked.map((b) => (
                <li key={b.uid} className="flex items-baseline justify-between gap-6 border-b border-on-table-2/25 py-3 text-base">
                  <span className="text-on-table">{b.name || "Ohne Namen"}</span>
                  <TextButton className="text-sm" onClick={() => unblockSender(user.uid, b.uid).catch(() => {})}>
                    Wieder zeigen
                  </TextButton>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isAdmin(user) && <Reports />}

        <section aria-labelledby="hilfe-h" className="mt-16">
          <h2 id="hilfe-h" className="text-on-table text-xl font-semibold tracking-[-0.01em]">
            Rechtliches und Hilfe
          </h2>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-base">
            {[
              ["/hilfe", "Hilfe"],
              ["/nutzungsbedingungen", "Nutzungsbedingungen"],
              ["/datenschutz", "Datenschutz"],
              ["/impressum", "Impressum"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={`${linkClass} underline`}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-on-table-2 mt-5 max-w-xl text-sm leading-relaxed">
            Fragen, Fehler oder ein Inhalt, der nicht hierher gehört:{" "}
            <a href={`mailto:${OPERATOR.email}`} className={`${linkClass} underline`}>
              {OPERATOR.email}
            </a>
            . Calima ist nicht mit Fujifilm verbunden; FUJIFILM und FUJI sind Marken der FUJIFILM Corporation.
          </p>
        </section>
      </div>
      {renaming && (
        <RenameDialog
          user={user}
          onClose={(n) => {
            setRenaming(false);
            if (n) setName(n);
          }}
        />
      )}
      {deleting && <DeleteAccount user={user} counts={{ books: own?.length, photos, shares: shares?.length }} onClose={() => setDeleting(false)} />}
    </main>
  );
}

/**
 * Konto löschen: erst bestätigen, dann neu anmelden (Firebase verlangt eine frische Anmeldung), dann alles löschen.
 * Danach gibt es keinen Weg zurück, deshalb steht im Dialog genau, was verschwindet.
 */
function DeleteAccount({ user, counts, onClose }: { user: User; counts: { books?: number; photos?: number; shares?: number }; onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = step !== null;
  const mock = process.env.NEXT_PUBLIC_FUJI_MOCK === "1";

  const run = async () => {
    setError(null);
    let revoke: AppleRevoke = {};
    try {
      setStep("Anmeldung bestätigen");
      if (!mock) revoke = await confirmIdentity(user);
    } catch (e) {
      setStep(null);
      const msg = signInError(e);
      if (msg) setError(msg);
      return;
    }
    try {
      await deleteAccountData(user.uid, (s) => setStep(`${s} werden gelöscht`));
      setStep("Konto wird gelöscht");
      if (!mock) await deleteAccountUser(user, revoke);
      setSessionHint(false);
      router.replace("/konto-geloescht");
    } catch (e) {
      setStep(null);
      setError(`${friendlyError(e)} Was schon gelöscht ist, bleibt gelöscht. Versuch es bitte nochmal.`);
    }
  };

  const count = (v: number | undefined) => (v === undefined ? "" : ` (${v})`);
  return (
    <SlipDialog label="Konto löschen" onClose={() => !busy && onClose()}>
      <p className="text-sm leading-relaxed">Gelöscht wird alles, was zu deinem Konto gehört:</p>
      <ul className="mt-2 text-sm leading-relaxed">
        <li>· deine Bücher{count(counts.books)} mit allen Fotos{count(counts.photos)}, Zwischenständen und dem Papierkorb</li>
        <li>· deine geteilten Links{count(counts.shares)} samt Zetteln und Eselsohren der Gäste</li>
        <li>· deine Ablage „Für dich“ und deine eigenen Rezepte</li>
        <li>· dein Konto bei Calima</li>
      </ul>
      <p className="mt-3 text-sm leading-relaxed">Wer einen Link von dir hat, kann das Buch danach nicht mehr öffnen.</p>
      <p className="mt-3 text-sm leading-relaxed font-semibold">Das lässt sich nicht rückgängig machen.</p>
      {!mock && <p className="text-ink-2 mt-3 text-[13px]">Zur Sicherheit meldest du dich dafür noch einmal an.</p>}
      {error && (
        <p role="alert" className="text-ink mt-3 text-[13px] font-semibold">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-sm">
        <button
          type="button"
          disabled={busy}
          onClick={run}
          className="border-ink bg-ink text-paper hover:bg-ink/85 min-h-11 border px-3 py-2 font-semibold disabled:opacity-60"
        >
          {busy ? `${step} …` : "Konto endgültig löschen"}
        </button>
        <button type="button" disabled={busy} onClick={onClose} className="min-h-11 underline decoration-mark decoration-2 underline-offset-4">
          Abbrechen
        </button>
      </div>
    </SlipDialog>
  );
}

/** Nur für Michel: offene Meldungen mit „Link sperren“. Konten sperrt er in der Firebase-Konsole (Authentication → Nutzer) */
function Reports() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    openReports()
      .then((r) => alive && setReports(r))
      .catch((e) => alive && setError(friendlyError(e)));
    return () => {
      alive = false;
    };
  }, []);
  const done = (id: string) => setReports((all) => all?.filter((r) => r.id !== id) ?? null);
  const act = (id: string, run: () => Promise<void>) => run().then(() => done(id)).catch((e) => setError(friendlyError(e)));

  return (
    <section aria-labelledby="reports-h" className="mt-16">
      <h2 id="reports-h" className="text-on-table text-xl font-semibold tracking-[-0.01em]">
        Meldungen
      </h2>
      {error && (
        <p role="alert" className="text-on-table mt-3 text-sm">
          {error}
        </p>
      )}
      {reports && reports.length === 0 && <p className="text-on-table-2 mt-3 text-base">Keine offenen Meldungen.</p>}
      {reports && reports.length > 0 && (
        <ul className="mt-4 border-t border-on-table-2/40">
          {reports.map((r) => (
            <li key={r.id} className="border-b border-on-table-2/25 py-3 text-base">
              <p className="text-on-table">
                {REPORT_REASONS[r.reason] ?? r.reason} · „{r.title || "Ohne Titel"}“ von {r.fromName}
              </p>
              {r.text && <p className="text-on-table-2 mt-1 text-sm">„{r.text}“</p>}
              <p className="text-on-table-2 mt-1 text-sm">
                {r.at ? new Date(r.at.seconds * 1000).toLocaleString("de-DE") : ""} · Macher-ID {r.owner}
              </p>
              <p className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <Link href={`/b?t=${r.token}`} className={linkClass}>
                  Ansehen
                </Link>
                <TextButton onClick={() => act(r.id, async () => {
                  await takeDownShare(r.token);
                  await closeReport(r.id);
                })}>
                  Link sperren
                </TextButton>
                <TextButton className="text-on-table-2" onClick={() => act(r.id, () => closeReport(r.id))}>
                  Erledigt, alles in Ordnung
                </TextButton>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Name, der als Absender auf Büchern und Zetteln steht. Apple gibt ihn nur beim ersten Anmelden heraus
 * und nicht, wenn man ihn verbirgt; dann steht hier „Ohne Namen“ und man trägt ihn selbst ein.
 */
function RenameDialog({ user, onClose }: { user: User; onClose: (name?: string) => void }) {
  const [name, setName] = useState(user.displayName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <SlipDialog label="Name ändern" onClose={() => !busy && onClose()}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setBusy(true);
          renameUser(user, name.trim())
            .then(() => onClose(name.trim()))
            .catch((err) => {
              setBusy(false);
              setError(friendlyError(err));
            });
        }}
      >
        <label className="block text-[13px]">
          <span className="text-ink-2">So steht es als Absender auf neuen Büchern und Zetteln</span>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} autoComplete="name" className={inputClass} />
        </label>
        {error && (
          <p role="alert" className="text-ink mt-3 text-[13px] font-semibold">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-sm">
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="border-ink text-ink hover:bg-ink hover:text-paper min-h-11 border px-3 py-2 font-semibold transition-colors duration-150 disabled:opacity-50"
          >
            Speichern
          </button>
          <button type="button" disabled={busy} onClick={() => onClose()} className="min-h-11 underline decoration-mark decoration-2 underline-offset-4">
            Abbrechen
          </button>
        </div>
      </form>
    </SlipDialog>
  );
}
