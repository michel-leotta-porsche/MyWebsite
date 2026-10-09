"use client";

import { Film as FilmIcon, SwitchCamera, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";

import { IconButton } from "@/components/ui/button";
import { CalimaCamera, FILM_FRAMES, grainOf, isDenied, LUT_N, lutOf, takeShot, type Frame } from "@/lib/camera";
import { bakePhoto } from "@/lib/develop/bake";
import { buildLut, neutralEdit, PRESETS, type NamedRecipe, type PhotoEdit } from "@/lib/develop/model";
import { applySettings, type CopiedSettings } from "@/lib/develop/settings";
import { haptic } from "@/lib/haptics";
import { SIZES, studioSource } from "@/lib/ingest";
import { useT } from "@/lib/i18n";
import { useRecentSettings } from "@/lib/settings-clipboard";
import { myRecipes, newId } from "@/lib/store";
import type { Print } from "@/lib/studio-store";

// Calimas Kamera (Kamera-Workshop 9.10.2026, kamera-workshop-2026-10-09/): ein Bildschirm, eine Hand, kein Menü.
// Der Sucher ist der native Teil (ios/App/App/CalimaCamera.swift) hinter der durchsichtigen Seite; hier liegen nur
// Look-Pillen, Auslöser und Gesten. Gedrückt halten zeigt das Original (wie beim Bearbeiten), Wischen nach oben oder
// unten macht heller oder dunkler, zwei Finger zoomen, ein Tipp stellt scharf. Jedes Foto wird ein Abzug im Fotostudio,
// mit dem Look als Bearbeitung; eingerechnet wird erst beim Sichern, dann auch die Klarheit. Die Körnung läuft schon im
// Sucher mit. „Film einlegen“ (Stufe 2) hält einen Look fest: FILM_FRAMES Bilder, die als ein Stapel im Fotostudio
// landen, auch über mehrere Kamera-Sitzungen hinweg; der Kamera-Knopf und die Lautstärketasten lösen aus.

type Look = { id: string; name: string; approx: boolean; edit: PhotoEdit | null };
/** ein eingelegter Film: bleibt im Gerät, bis er voll ist oder entnommen wird */
type Film = { name: string; approx: boolean; edit: PhotoEdit | null; stack: string; count: number };

const ORIGINAL = "original";
const LAST_KEY = "calima:kamera-look";
const FILM_KEY = "calima:film";
const readFilm = (): Film | null => {
  try {
    const f = JSON.parse(localStorage.getItem(FILM_KEY) ?? "null");
    return f && typeof f.stack === "string" && typeof f.count === "number" ? (f as Film) : null;
  } catch {
    return null;
  }
};
const writeFilm = (f: Film | null) => {
  try {
    if (f) localStorage.setItem(FILM_KEY, JSON.stringify(f));
    else localStorage.removeItem(FILM_KEY);
  } catch {}
};
const HOLD_MS = 220;
const MOVE_PX = 10;
const EV_MAX = 2;

const lookOfSettings = (s: CopiedSettings, id: string): Look => ({ id, name: s.name, approx: s.approx, edit: applySettings(neutralEdit(), s) });
const lookOfRecipe = (r: NamedRecipe): Look => ({ id: r.id, name: r.name, approx: false, edit: { ...neutralEdit(), ...(r.f ?? {}), rec: { ...r.v }, recName: r.name } });

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
};
const evLabel = (ev: number) => `${ev > 0 ? "+" : ev < 0 ? "−" : "±"}${Math.abs(ev).toFixed(1)}`;

export function Camera({ uid, onShot, onFilmDone, onClose }: { uid: string; onShot: (p: Print, stack?: string) => void; onFilmDone: (stack: string) => void; onClose: () => void }) {
  const t = useT();
  const recent = useRecentSettings();
  const [own, setOwn] = useState<NamedRecipe[]>([]);
  const [lookId, setLookId] = useState<string>(() => {
    try {
      return localStorage.getItem(LAST_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [front, setFront] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [ev, setEv] = useState(0);
  const [showEv, setShowEv] = useState(false);
  const [holding, setHolding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [count, setCount] = useState(0);
  const [last, setLast] = useState<string | null>(null);
  const [reticle, setReticle] = useState<{ x: number; y: number; k: number } | null>(null);
  const [film, setFilm] = useState<Film | null>(readFilm);
  const box = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    myRecipes(uid)
      .then(setOwn)
      .catch(() => {});
  }, [uid]);

  // Looks in der Reihenfolge Original, zuletzt mitgenommen, Deine Looks, Voreinstellungen; gleiche Namen nur einmal
  const looks = useMemo<Look[]>(() => {
    const out: Look[] = [{ id: ORIGINAL, name: t("Original"), approx: false, edit: null }];
    const seen = new Set<string>();
    const add = (l: Look) => {
      if (seen.has(l.name)) return;
      seen.add(l.name);
      out.push(l);
    };
    recent.forEach((s, i) => add(lookOfSettings(s, `recent-${i}`)));
    own.forEach((r) => add(lookOfRecipe(r)));
    PRESETS.forEach((r) => add(lookOfRecipe(r)));
    return out;
  }, [recent, own, t]);
  // ein eingelegter Film legt den Look fest; sonst der zuletzt gewählte, sonst der zuletzt mitgenommene („So fotografieren“), sonst Sommerlicht
  const chosen = looks.find((l) => l.id === lookId) ?? (recent.length ? looks[1] : (looks.find((l) => l.id === PRESETS[0].id) ?? looks[0]));
  const active: Look = film ? { id: "film", name: film.name, approx: film.approx, edit: film.edit } : chosen;

  const frameOf = useCallback((): Frame | null => {
    const r = box.current?.getBoundingClientRect();
    return r && r.width > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
  }, []);

  // Seite durchsichtig machen und die Kamera hinter dem Sucher starten
  useEffect(() => {
    document.documentElement.dataset.kamera = "";
    let alive = true;
    const run = async () => {
      // erst nach dem ersten Zeichnen: der Rahmen muss stehen, bevor der Sucher seine Lage bekommt
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const frame = frameOf();
      if (!frame || !alive) return;
      try {
        const lut = active.edit ? lutOf(active.edit) : undefined;
        const r = await CalimaCamera.start({ frame, ...lut });
        if (!alive) return;
        started.current = true;
        setFront(r.front);
        setReady(true);
      } catch (e) {
        if (alive) setError(isDenied(e) ? t("Calima darf die Kamera nicht nutzen. Erlaube sie in den Einstellungen des iPhones unter Calima.") : t("Die Kamera lässt sich gerade nicht öffnen."));
      }
    };
    run();
    const onResize = () => {
      const frame = frameOf();
      if (frame && started.current) CalimaCamera.layout({ frame }).catch(() => {});
    };
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      window.removeEventListener("resize", onResize);
      delete document.documentElement.dataset.kamera;
      CalimaCamera.stop().catch(() => {});
      started.current = false;
    };
    // nur beim Öffnen; der Look danach läuft über setLut
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Look wechseln: der LUT geht hinüber, der Name bleibt gemerkt
  useEffect(() => {
    if (!ready) return;
    const l = active.edit ? lutOf(active.edit) : null;
    if (l) CalimaCamera.setLut(l).catch(() => {});
    else CalimaCamera.setOriginal({ on: true }).catch(() => {});
    if (l && !holding) CalimaCamera.setOriginal({ on: false }).catch(() => {});
    CalimaCamera.setGrain(grainOf(active.edit)).catch(() => {});
    try {
      localStorage.setItem(LAST_KEY, active.id);
    } catch {}
    // holding gehört nicht dazu: beim Loslassen stellt der Zeiger den Look selbst zurück
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ready]);

  const pick = (l: Look) => {
    if (l.id === active.id) return;
    haptic("select");
    setLookId(l.id);
  };

  /* ----- Film: ein Look, FILM_FRAMES Bilder, ein Stapel; bleibt eingelegt, bis er voll ist oder entnommen wird ----- */

  const loadFilm = () => {
    if (!ready || film) return;
    haptic("press");
    const f: Film = { name: active.name, approx: active.approx, edit: active.edit, stack: newId(), count: 0 };
    writeFilm(f);
    setFilm(f);
  };
  const ejectFilm = () => {
    if (!film) return;
    haptic("select");
    writeFilm(null);
    setFilm(null);
    if (film.count) onFilmDone(film.stack);
  };

  /* ----- Gesten im Sucher: halten (Original), wischen (Licht), zwei Finger (Zoom), tippen (Schärfe) ----- */

  const gesture = useRef<{ id: number; x: number; y: number; t: number; ev0: number; mode: "wait" | "hold" | "drag" | "pinch" | "done"; timer: number; d0?: number; z0?: number; second?: { id: number; x: number; y: number } } | null>(null);
  const raf = useRef(0);
  const queued = useRef<(() => void) | null>(null);
  const later = (fn: () => void) => {
    queued.current = fn;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      queued.current?.();
      queued.current = null;
    });
  };

  const holdOriginal = (on: boolean) => {
    if (!active.edit) return;
    setHolding(on);
    CalimaCamera.setOriginal({ on }).catch(() => {});
  };

  const onDown = (e: ReactPointerEvent) => {
    if (!ready) return;
    const g = gesture.current;
    if (g && g.mode !== "done" && e.pointerId !== g.id) {
      // zweiter Finger: ab jetzt wird gezoomt
      window.clearTimeout(g.timer);
      if (g.mode === "hold") holdOriginal(false);
      g.second = { id: e.pointerId, x: e.clientX, y: e.clientY };
      g.d0 = Math.hypot(e.clientX - g.x, e.clientY - g.y);
      g.z0 = zoom;
      g.mode = "pinch";
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const timer = window.setTimeout(() => {
      const cur = gesture.current;
      if (cur && cur.mode === "wait") {
        cur.mode = "hold";
        holdOriginal(true);
      }
    }, HOLD_MS);
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), ev0: ev, mode: "wait", timer };
  };

  const onMove = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g || g.mode === "done") return;
    if (g.mode === "pinch") {
      if (e.pointerId === g.id) {
        g.x = e.clientX;
        g.y = e.clientY;
      } else if (g.second && e.pointerId === g.second.id) {
        g.second.x = e.clientX;
        g.second.y = e.clientY;
      } else return;
      if (!g.second || !g.d0 || !g.z0) return;
      const d = Math.hypot(g.second.x - g.x, g.second.y - g.y);
      const want = Math.min(10, Math.max(0.5, (g.z0 * d) / g.d0));
      later(() => CalimaCamera.setZoom({ factor: want }).then((r) => setZoom(r.factor)).catch(() => {}));
      return;
    }
    if (e.pointerId !== g.id) return;
    const dy = e.clientY - g.y;
    if (g.mode === "wait" && Math.hypot(e.clientX - g.x, dy) > MOVE_PX) {
      window.clearTimeout(g.timer);
      g.mode = "drag";
      setShowEv(true);
    }
    if (g.mode === "drag") {
      const next = Math.round(Math.min(EV_MAX, Math.max(-EV_MAX, g.ev0 - dy / 120)) * 10) / 10;
      if (next !== ev) {
        setEv(next);
        later(() => CalimaCamera.setExposure({ ev: next }).catch(() => {}));
      }
    }
  };

  const onUp = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    if (g.mode === "pinch") {
      // der erste Finger, der geht, beendet den Zoom; der andere macht nichts mehr
      g.mode = "done";
      return;
    }
    if (e.pointerId !== g.id) return;
    window.clearTimeout(g.timer);
    if (g.mode === "hold") holdOriginal(false);
    if (g.mode === "drag") window.setTimeout(() => setShowEv(false), 900);
    if (g.mode === "wait" && e.type !== "pointercancel") {
      // kurzer Tipp: scharf stellen, die Marke zeigt wo
      const r = box.current?.getBoundingClientRect();
      if (r) {
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        CalimaCamera.focus({ x, y }).catch(() => {});
        setReticle({ x: e.clientX - r.left, y: e.clientY - r.top, k: Date.now() });
        window.setTimeout(() => setReticle((cur) => (cur && Date.now() - cur.k >= 900 ? null : cur)), 1000);
      }
    }
    gesture.current = null;
  };

  /* ----- Auslösen: das Original kommt als Datei, der Look liegt als Bearbeitung auf dem Abzug ----- */

  const shoot = async () => {
    if (!ready || busy) return;
    setBusy(true);
    haptic("press");
    setFlash(true);
    window.setTimeout(() => setFlash(false), 140);
    try {
      const { path } = await CalimaCamera.capture();
      const file = await takeShot(path, `${t("Kamera")} ${stamp()}`);
      const s = await studioSource(file);
      const edit = active.edit ?? undefined;
      const onFilm = film;
      const print: Print = { id: newId(), name: file.name.replace(/\.jpg$/, ""), at: Date.now(), w: s.w, h: s.h, work: s.work, page: s.page, thumb: s.thumb, meta: s.meta, edit, pos: onFilm?.count };
      onShot(print, onFilm?.stack);
      setCount((n) => n + 1);
      if (onFilm) {
        const next = { ...onFilm, count: onFilm.count + 1 };
        if (next.count >= FILM_FRAMES) {
          // voll: der Film kommt als Stapel ins Fotostudio, die Kamera bleibt offen
          writeFilm(null);
          setFilm(null);
          haptic("success");
          onFilmDone(onFilm.stack);
        } else {
          writeFilm(next);
          setFilm(next);
        }
      }
      setLast((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(s.thumb);
      });
      // das letzte Bild unten links zeigt den Look, sobald er klein eingerechnet ist
      if (edit) {
        const url = URL.createObjectURL(s.page);
        bakePhoto({ url, lut: buildLut(edit, LUT_N), n: LUT_N, rec: edit.rec, sizes: { large: SIZES.thumb, page: SIZES.thumb, thumb: SIZES.thumb } })
          .then((r) => {
            onShot({ ...print, shot: r.blobs.thumb }, onFilm?.stack);
            setLast((old) => {
              if (old) URL.revokeObjectURL(old);
              return URL.createObjectURL(r.blobs.thumb);
            });
          })
          .catch(() => {})
          .finally(() => URL.revokeObjectURL(url));
      }
    } catch {
      haptic("warning");
      setError(t("Das Foto ließ sich nicht aufnehmen. Versuch es noch einmal."));
      window.setTimeout(() => setError(null), 2500);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => () => void (last && URL.revokeObjectURL(last)), [last]);

  // Kamera-Knopf und Lautstärketasten lösen aus, Wischen am Knopf zoomt; der Auslöser hier ist immer der aktuelle
  const shootRef = useRef(shoot);
  useEffect(() => {
    shootRef.current = shoot;
  });
  useEffect(() => {
    const sub = CalimaCamera.addListener("event", (e) => {
      if (e.name === "shutter") shootRef.current();
      else if (e.name === "zoom" && typeof e.data.factor === "number") setZoom(e.data.factor);
    });
    return () => {
      sub.then((h) => h.remove()).catch(() => {});
    };
  }, []);

  const flip = () => {
    if (!ready || busy) return;
    haptic("select");
    CalimaCamera.flip()
      .then((r) => {
        setFront(r.front);
        setZoom(1);
      })
      .catch(() => {});
  };

  const title = holding ? t("Original") : active.name;
  const sub = holding
    ? t("Loslassen bringt den Look zurück")
    : film
      ? t("Film, {i} von {n}", { i: film.count, n: FILM_FRAMES })
      : active.approx
        ? t("nachempfunden")
        : active.edit
          ? ""
          : t("Ohne Look");

  return createPortal(
    <div id="calima-kamera" className="text-on-table fixed inset-0 z-[600] flex flex-col bg-transparent select-none" role="dialog" aria-label={t("Kamera")}>
      <header className="bg-table-deep flex items-center justify-between gap-2 px-3 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}>
        <IconButton label={t("Schließen")} variant="quiet" onClick={onClose} className="text-on-table">
          <X aria-hidden />
        </IconButton>
        <div className="min-w-0 text-center" aria-live="polite">
          <p className="truncate text-[15px] leading-tight font-bold tracking-[-0.01em]">{title}</p>
          <p className="text-on-table-2 truncate text-[12px] leading-tight">{sub || " "}</p>
        </div>
        <span className="text-on-table-2 w-11 text-right text-[13px] tabular-nums" aria-label={t("Zoom {factor}", { factor: `${zoom.toFixed(zoom < 1 ? 1 : zoom % 1 ? 1 : 0)}×` })}>
          {zoom.toFixed(zoom < 1 || zoom % 1 ? 1 : 0)}×
        </span>
      </header>

      {/* Sucher: 3:4 wie das Foto, durchsichtig; dahinter zeichnet die App */}
      <div className="bg-table-deep relative flex min-h-0 flex-1 flex-col">
        <div
          ref={box}
          className="relative mx-auto w-full max-w-full touch-none"
          style={{ aspectRatio: "3 / 4", maxHeight: "100%" } as CSSProperties}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {!ready && !error && (
            <p className="text-on-table-2 absolute inset-0 grid place-items-center text-sm" aria-live="polite">
              {t("Kamera öffnet …")}
            </p>
          )}
          {error && (
            <p role="alert" className="text-on-table absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-[15px] leading-snug">
              {error}
            </p>
          )}
          {flash && <span aria-hidden className="bg-paper/90 absolute inset-0" />}
          {reticle && (
            <span aria-hidden className="border-cloth pointer-events-none absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 border-2 opacity-90" style={{ left: reticle.x, top: reticle.y }} />
          )}
          {showEv && (
            <span aria-hidden className="bg-table-deep/70 text-on-table absolute top-3 right-3 rounded-full px-2.5 py-1 text-[13px] font-semibold tabular-nums">
              {evLabel(ev)}
            </span>
          )}
        </div>
      </div>

      <footer className="bg-table-deep grid gap-3 pt-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
        {film ? (
          <div className="flex items-center gap-3 px-4 pb-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="truncate font-semibold">{film.name}</span>
                <span className="text-on-table-2 flex-none tabular-nums">{t("{i} von {n}", { i: film.count, n: FILM_FRAMES })}</span>
              </div>
              {/* der Zählstreifen: ein Strich je Bild, so viele voll wie belichtet */}
              <div className="mt-1.5 flex gap-[3px]" aria-hidden>
                {Array.from({ length: FILM_FRAMES }, (_, i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i < film.count ? "bg-cloth" : "bg-on-table-2/30"}`} />
                ))}
              </div>
            </div>
            <button type="button" onClick={ejectFilm} className="border-on-table-2/50 text-on-table flex-none rounded-full border px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap">
              {film.count ? t("Film entnehmen") : t("Film raus")}
            </button>
          </div>
        ) : (
        <ul className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" aria-label={t("Looks")}>
          <li className="flex-none">
            <button type="button" onClick={loadFilm} disabled={!ready} className="border-on-table-2/50 text-on-table flex items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-semibold whitespace-nowrap disabled:opacity-50">
              <FilmIcon aria-hidden className="h-4 w-4" />
              {t("Film einlegen")}
            </button>
          </li>
          {looks.map((l) => {
            const on = l.id === active.id;
            return (
              <li key={l.id} className="flex-none">
                <button
                  type="button"
                  onClick={() => pick(l)}
                  aria-pressed={on}
                  className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors ${on ? "bg-cloth border-cloth text-cloth-ink" : "border-on-table-2/50 text-on-table"}`}
                >
                  {l.name}
                </button>
              </li>
            );
          })}
        </ul>
        )}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-7">
          <span className="justify-self-start">
            <span className="relative block h-12 w-12 overflow-hidden rounded-[10px] border-2 border-on-table-2/60">
              {/* eslint-disable-next-line @next/next/no-img-element -- Blob vom Gerät */}
              {last && <img src={last} alt="" className="h-full w-full object-cover" />}
              {count > 0 && (
                <span className="bg-cloth text-cloth-ink absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold tabular-nums">{count}</span>
              )}
            </span>
          </span>
          <button
            type="button"
            onClick={shoot}
            disabled={!ready || busy}
            aria-label={t("Auslösen")}
            className="border-on-table grid h-[76px] w-[76px] place-items-center rounded-full border-4 disabled:opacity-50"
          >
            <span aria-hidden className={`bg-on-table block h-[60px] w-[60px] rounded-full transition-transform ${busy ? "scale-90" : ""}`} />
          </button>
          <span className="justify-self-end">
            <IconButton label={front ? t("Rückkamera") : t("Frontkamera")} variant="quiet" onClick={flip} className="text-on-table border-on-table-2/60 h-12 w-12 rounded-full border-2">
              <SwitchCamera aria-hidden />
            </IconButton>
          </span>
        </div>
        <p className="text-on-table-2 px-6 text-center text-[12px]">
          {film
            ? t("Der Film bleibt drin, bis {n} Bilder drauf sind oder du ihn entnimmst. Dann liegt er als Stapel im Fotostudio.", { n: FILM_FRAMES })
            : count
              ? t("{n} im Stapel. Schließen bringt dich zu Fertig.", { n: count === 1 ? t("Ein Foto") : t("{n} Fotos", { n: count }) })
              : t("Halten zeigt das Original, Wischen macht heller oder dunkler.")}
        </p>
      </footer>
    </div>,
    document.body,
  );
}
