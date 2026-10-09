"use client";

import { Ban, Check, Eye, EyeOff, Gift, Info, LifeBuoy, LogOut, Mail, PenLine, ScrollText, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { RequireUser, RoomNav, RoomTitle } from "@/components/app-ui";
import { Button, buttonClass } from "@/components/ui/button";
import { ListGroup, ListRow, StatusPill } from "@/components/ui/list";
import { Field } from "@/components/ui/field";
import { MountedSheet } from "@/components/ui/sheet";
import { OPERATOR } from "@/components/legal";
import { confirmIdentity, deleteAccountUser, providerOf, renameUser, signOutNow, type AppleRevoke, type User } from "@/lib/firebase";
import { friendlyError, signInError } from "@/lib/errors";
import { getLang, locale, useLang, useT } from "@/lib/i18n";
import { setSessionHint } from "@/lib/session-hint";
import { clearPrints } from "@/lib/studio-store";
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
  const t = useT();
  return (
    <RequireUser title={t("Dein Profil")} text={t("Melde dich an, dann siehst du hier deine Bücher, deine geteilten Links und dein Konto.")}>
      {(user) => <Card user={user} />}
    </RequireUser>
  );
}

const H2 = "text-on-table text-xl font-semibold tracking-[-0.01em]";

const PROVIDER_NAMES = { "google.com": "Google", "apple.com": "Apple" } as const;

const since = (user: User) => {
  const created = user.metadata?.creationTime;
  if (!created) return null;
  const d = new Date(created);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(locale(getLang()), { month: "long", year: "numeric" });
};

function Card({ user }: { user: User }) {
  const router = useRouter();
  const t = useT();
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
  const titleOf = new Map((own ?? []).map((b) => [b.id, b.title || t("Ohne Titel")]));
  const stats = [
    { label: t("Eigene Bücher"), value: books?.length, href: "/zimmer#von-dir" },
    { label: t("Fotos darin"), value: photos, href: "/zimmer#von-dir" },
    { label: t("Hingelegt"), value: shares?.length, href: "#hingelegt" },
    { label: t("Für dich"), value: gifts?.length, href: "/zimmer" },
  ];
  const joined = since(user);

  return (
    <main className="linen table-surface relative flex min-h-svh flex-col bg-table">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-8 md:pt-6">
        <RoomTitle>{t("Profil")}</RoomTitle>
        <RoomNav />
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pt-10 pb-20 md:px-8 md:pt-16">
        <div className="flex items-center gap-4">
          {/* Avatar: Kreis, getönt statt Gelb (rundung.md) */}
          <span aria-hidden className="bg-on-table/10 text-on-table grid size-16 shrink-0 place-items-center rounded-full text-2xl font-bold shadow-[inset_0_0_0_1px_rgb(236_230_220/0.12)]">
            {(name ?? "?").trim().charAt(0).toUpperCase() || "?"}
          </span>
          <div className="min-w-0">
            <p className="text-on-table truncate text-4xl leading-[0.95] font-bold tracking-[-0.03em] md:text-5xl" style={{ fontVariationSettings: '"wdth" 78, "opsz" 72' }}>
              {name ?? t("Ohne Namen")}
            </p>
            <p className="text-on-table-2 mt-1.5 truncate text-sm">
              {t("Angemeldet mit {provider}", { provider: PROVIDER_NAMES[providerOf(user)] })}
              {user.email && <> · {user.email}</>}
            </p>
          </div>
        </div>

        {/* Leseausweis: zugeschnittener Karton (rounded-cut), die Zahlen führen dorthin, wo die Dinge liegen */}
        <section aria-labelledby="ausweis-h" className="slip text-ink mt-10 -rotate-[0.6deg] rounded-cut p-5 shadow-[0_24px_40px_-22px_rgb(12_10_8/0.9)] md:p-6">
          <div className="border-ink/25 flex items-baseline justify-between gap-4 border-b border-dashed pb-3">
            <h2 id="ausweis-h" className="text-lg font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
              {t("Leseausweis")}
            </h2>
            {joined && <span className="text-ink-2 text-[13px]">{t("seit {date}", { date: joined })}</span>}
          </div>
          <dl className="mt-1 grid grid-cols-2 gap-x-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <Link href={s.href} className="block py-3 focus-visible:outline-ink">
                  <dt className="text-ink-2 text-[13px]">{s.label}</dt>
                  <dd className="mt-0.5 text-4xl font-bold tracking-[-0.03em] tabular-nums" style={{ fontVariationSettings: '"wdth" 80' }}>
                    {s.value ?? <span className="text-ink-2">–</span>}
                  </dd>
                </Link>
              </div>
            ))}
          </dl>
        </section>

        {error && (
          <p role="alert" className="text-on-table mt-6 text-sm">
            {t("Konnte nicht alles laden: {error}", { error })}
          </p>
        )}

        <section id="hingelegt" aria-labelledby="hingelegt-h" className="mt-12 scroll-mt-8">
          <h2 id="hingelegt-h" className={H2}>
            {t("Hingelegt für")}
          </h2>
          {shares && shares.length === 0 && (
            <p className="text-on-table-2 mt-2 text-base">{t("Noch niemand. Im Bücherzimmer legst du ein Buch über „Mehr …“ und „Hinlegen für …“ einem Freund hin.")}</p>
          )}
          {shares && shares.length > 0 && (
            <ListGroup label={t("Hingelegt für")} className="mt-3">
              {shares.map((s) => (
                <ListRow
                  key={s.token}
                  lead={<Gift aria-hidden />}
                  title={s.to}
                  detail={titleOf.get(s.bookId ?? s.book?.id) ?? s.book?.title ?? t("Ohne Titel")}
                  trail={<StatusPill>{s.paused ? t("ruht, im Papierkorb") : t("liegt bereit")}</StatusPill>}
                  href={s.paused ? undefined : `/b?t=${s.token}`}
                />
              ))}
            </ListGroup>
          )}
        </section>

        <section aria-labelledby="konto-h" className="mt-12">
          <h2 id="konto-h" className={H2}>
            {t("Konto")}
          </h2>
          <ListGroup label={t("Konto")} className="mt-3">
            <ListRow lead={<PenLine aria-hidden />} title={t("Name ändern")} detail={t("Steht als Absender auf Büchern und Zetteln")} onClick={() => setRenaming(true)} />
            <ListRow lead={<LogOut aria-hidden />} title={t("Abmelden")} onClick={() => signOutNow().then(() => router.push("/"))} />
            <ListRow lead={<Trash2 aria-hidden />} title={t("Konto löschen")} detail={t("Mit allen Büchern und Links")} danger onClick={() => setDeleting(true)} />
          </ListGroup>
          <p className="text-on-table-2 mt-3 max-w-xl text-sm leading-relaxed">
            {t("Deine Bücher sieht nur, wem du einen Link gibst. Den Aufbau eines Buchs sicherst du beim Bearbeiten unter „Verlauf“ als Datei; die Fotos bleiben in deinem Konto.")}
          </p>
        </section>

        {blocked.length > 0 && (
          <section aria-labelledby="blocked-h" className="mt-12">
            <h2 id="blocked-h" className={H2}>
              {t("Ausgeblendet")}
            </h2>
            <p className="text-on-table-2 mt-2 max-w-xl text-sm">{t("Bücher dieser Personen landen nicht mehr in deinem Bücherzimmer.")}</p>
            <ListGroup label={t("Ausgeblendet")} className="mt-3">
              {blocked.map((b) => (
                <ListRow
                  key={b.uid}
                  lead={<EyeOff aria-hidden />}
                  title={b.name || t("Ohne Namen")}
                  trail={
                    <Button size="sm" onClick={() => unblockSender(user.uid, b.uid).catch(() => {})}>
                      {t("Wieder zeigen")}
                    </Button>
                  }
                />
              ))}
            </ListGroup>
          </section>
        )}

        {isAdmin(user) && <Reports />}

        <section aria-labelledby="hilfe-h" className="mt-12">
          <h2 id="hilfe-h" className={H2}>
            {t("Rechtliches und Hilfe")}
          </h2>
          <ListGroup label={t("Rechtliches und Hilfe")} className="mt-3">
            <ListRow lead={<LifeBuoy aria-hidden />} title={t("Hilfe")} href="/hilfe" />
            <ListRow lead={<ScrollText aria-hidden />} title={t("Nutzungsbedingungen")} href="/nutzungsbedingungen" />
            <ListRow lead={<ShieldCheck aria-hidden />} title={t("Datenschutz")} href="/datenschutz" />
            <ListRow lead={<Info aria-hidden />} title={t("Impressum")} href="/impressum" />
            <ListRow lead={<Mail aria-hidden />} title={t("Schreib mir")} detail={OPERATOR.email} href={`mailto:${OPERATOR.email}`} />
          </ListGroup>
          <p className="text-on-table-2 mt-3 max-w-xl text-sm leading-relaxed">
            {t("Für Fragen, Fehler oder einen Inhalt, der nicht hierher gehört. Calima ist nicht mit Fujifilm verbunden; FUJIFILM und FUJI sind Marken der FUJIFILM Corporation.")}
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
  const t = useT();

  const run = async () => {
    setError(null);
    let revoke: AppleRevoke = {};
    try {
      setStep(t("Anmeldung bestätigen"));
      if (!mock) revoke = await confirmIdentity(user);
    } catch (e) {
      setStep(null);
      const msg = signInError(e);
      if (msg) setError(msg);
      return;
    }
    try {
      await deleteAccountData(user.uid, (s) => setStep(t("{what} werden gelöscht", { what: t(s) })));
      setStep(t("Konto wird gelöscht"));
      if (!mock) await deleteAccountUser(user, revoke);
      await clearPrints(user.uid).catch(() => {});
      setSessionHint(false);
      router.replace("/konto-geloescht");
    } catch (e) {
      setStep(null);
      setError(t("{error} Was schon gelöscht ist, bleibt gelöscht. Versuch es bitte nochmal.", { error: friendlyError(e) }));
    }
  };

  const count = (v: number | undefined) => (v === undefined ? "" : ` (${v})`);
  return (
    <MountedSheet title={t("Konto löschen")} onClose={onClose} locked={busy}>
      <p className="text-sm leading-relaxed">{t("Gelöscht wird alles, was zu deinem Konto gehört:")}</p>
      <ul className="mt-2 text-sm leading-relaxed">
        <li>· {t("deine Bücher{books} mit allen Fotos{photos}, Zwischenständen und dem Papierkorb", { books: count(counts.books), photos: count(counts.photos) })}</li>
        <li>· {t("deine geteilten Links{shares} samt Zetteln und Eselsohren der Gäste", { shares: count(counts.shares) })}</li>
        <li>· {t("deine Ablage „Für dich“ und deine eigenen Rezepte")}</li>
        <li>· {t("dein Konto bei Calima")}</li>
      </ul>
      <p className="mt-3 text-sm leading-relaxed">{t("Wer einen Link von dir hat, kann das Buch danach nicht mehr öffnen.")}</p>
      <p className="mt-3 text-sm leading-relaxed font-semibold">{t("Das lässt sich nicht rückgängig machen.")}</p>
      {!mock && <p className="text-ink-2 mt-3 text-[13px]">{t("Zur Sicherheit meldest du dich dafür noch einmal an.")}</p>}
      {error && (
        <p role="alert" className="text-ink mt-3 text-[13px] font-semibold">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button variant="danger" disabled={busy} onClick={run}>
          <Trash2 aria-hidden />
          {busy ? `${step} …` : t("Konto endgültig löschen")}
        </Button>
        <Button variant="paper" disabled={busy} onClick={onClose}>
          {t("Abbrechen")}
        </Button>
      </div>
    </MountedSheet>
  );
}

/** Nur für Michel: offene Meldungen mit „Link sperren“. Konten sperrt er in der Firebase-Konsole (Authentication → Nutzer) */
function Reports() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT();
  const lang = useLang();
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
    <section aria-labelledby="reports-h" className="mt-12">
      <h2 id="reports-h" className={H2}>
        {t("Meldungen")}
      </h2>
      {error && (
        <p role="alert" className="text-on-table mt-3 text-sm">
          {error}
        </p>
      )}
      {reports && reports.length === 0 && <p className="text-on-table-2 mt-3 text-base">{t("Keine offenen Meldungen.")}</p>}
      {reports && reports.length > 0 && (
        <ListGroup label={t("Meldungen")} className="mt-3">
          {reports.map((r) => (
            <li key={r.id} className="px-4 py-3.5 [&+li]:border-t [&+li]:border-on-table/8">
              <p className="text-on-table font-semibold">
                {REPORT_REASONS[r.reason] ? t(REPORT_REASONS[r.reason]) : r.reason} · {t("„{title}“ von {name}", { title: r.title || t("Ohne Titel"), name: r.fromName })}
              </p>
              {r.text && <p className="text-on-table-2 mt-1 text-sm">„{r.text}“</p>}
              <p className="text-on-table-2 mt-1 text-[13px]">
                {r.at ? new Date(r.at.seconds * 1000).toLocaleString(locale(lang)) : ""} · {t("Macher-ID {id}", { id: r.owner })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/b?t=${r.token}`} className={buttonClass("quiet", "sm")}>
                  <Eye aria-hidden />
                  {t("Ansehen")}
                </Link>
                <Button
                  size="sm"
                  className="text-danger-on-table"
                  onClick={() =>
                    act(r.id, async () => {
                      await takeDownShare(r.token);
                      await closeReport(r.id);
                    })
                  }
                >
                  <Ban aria-hidden />
                  {t("Link sperren")}
                </Button>
                <Button size="sm" onClick={() => act(r.id, () => closeReport(r.id))}>
                  <Check aria-hidden />
                  {t("Erledigt, alles in Ordnung")}
                </Button>
              </div>
            </li>
          ))}
        </ListGroup>
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
  const t = useT();
  return (
    <MountedSheet title={t("Name ändern")} description={t("So steht es als Absender auf neuen Büchern und Zetteln.")} onClose={() => onClose()} locked={busy}>
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
        <Field label={t("Name")} value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} autoComplete="name" />
        {error && (
          <p role="alert" className="text-ink mt-3 text-[13px] font-semibold">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button type="submit" variant="ink" disabled={busy || !name.trim()}>
            {t("Speichern")}
          </Button>
          <Button variant="paper" disabled={busy} onClick={() => onClose()}>
            {t("Abbrechen")}
          </Button>
        </div>
      </form>
    </MountedSheet>
  );
}
