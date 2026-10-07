"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { linkClass, RequireUser, RoomNav, RoomTitle, TextButton } from "@/components/app-ui";
import { signOutNow, type User } from "@/lib/firebase";
import { friendlyError } from "@/lib/errors";
import { inbox, myBooks, mySharesOf, type Share, type StoredBook } from "@/lib/store";

/** Profil: wer angemeldet ist, was auf den Tischen liegt, welche Links draußen sind */
export function Profile() {
  return (
    <RequireUser title="Dein Profil" text="Melde dich an, dann siehst du hier deine Bücher, deine geteilten Links und dein Konto.">
      {(user) => <Card user={user} />}
    </RequireUser>
  );
}

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
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 pt-4 md:px-8 md:pt-6">
        <RoomTitle>Profil</RoomTitle>
        <RoomNav />
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pt-14 pb-20 md:px-8 md:pt-20">
        <p className="text-on-table text-4xl leading-[0.95] font-bold tracking-[-0.03em] md:text-6xl" style={{ fontVariationSettings: '"wdth" 78, "opsz" 72' }}>
          {user.displayName ?? "Ohne Namen"}
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
            Angemeldet über Google. Deine Bücher sieht nur, wem du einen Link gibst. Ein Buch sicherst du beim Bearbeiten unter „Verlauf“ als Datei.
          </p>
          <p className="mt-5 text-sm">
            <TextButton onClick={() => signOutNow().then(() => router.push("/"))}>Abmelden</TextButton>
          </p>
        </section>
      </div>
    </main>
  );
}
