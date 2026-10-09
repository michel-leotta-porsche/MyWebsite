"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ANSWERS, qfd } from "@/content/qfd";
import { db } from "@/lib/firebase";

// Kano-Fragebogen: je Anforderung eine Frage mit und eine ohne die Eigenschaft.
// Anonym; gespeichert werden nur die Antwortnummern (0–4) und auf Wunsch, womit man fotografiert.

type Step = { req: string; kind: "f" | "d"; text: string };

export function KanoSurvey() {
  const reduce = useReducedMotion() ?? false;
  const steps: Step[] = qfd.features.survey.flatMap((q) => [
    { req: q.req, kind: "f" as const, text: q.functional },
    { req: q.req, kind: "d" as const, text: q.dysfunctional },
  ]);
  const [camera, setCamera] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, [number, number]>>({});
  const [state, setState] = useState<"frage" | "sendet" | "fertig" | "fehler">("frage");
  // beantwortete Schritte, damit „Zurück“ die eigene Antwort zeigt (UX-Kritik K15)
  const [done, setDone] = useState<Record<string, number>>({});

  const answer = async (a: number) => {
    const s = steps[i];
    const cur = answers[s.req] ?? [2, 2];
    const next = { ...answers, [s.req]: (s.kind === "f" ? [a, cur[1]] : [cur[0], a]) as [number, number] };
    setAnswers(next);
    setDone((d) => ({ ...d, [`${s.req}-${s.kind}`]: a }));
    if (i + 1 < steps.length) return setI(i + 1);
    send(next);
  };
  const send = async (all: Record<string, [number, number]>) => {
    setState("sendet");
    try {
      await addDoc(collection(db(), "kano"), { answers: all, ...(camera ? { camera } : {}), at: serverTimestamp() });
      setState("fertig");
    } catch {
      setState("fehler");
    }
  };

  const answerRef = useRef(answer);
  useEffect(() => {
    answerRef.current = answer;
  });
  // Ziffern 1 bis 5 antworten
  useEffect(() => {
    if (!started || state !== "frage") return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (e.metaKey || e.ctrlKey || e.altKey || !Number.isInteger(n) || n < 1 || n > ANSWERS.length) return;
      e.preventDefault();
      answerRef.current(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, state]);

  const s = steps[i];
  const chosen = s ? done[`${s.req}-${s.kind}`] : undefined;
  return (
    <main className="linen table-surface flex min-h-svh flex-col bg-table">
      <header className="flex items-baseline justify-between px-4 pt-4 md:px-8 md:pt-6">
        <Link href="/qfd" className="text-on-table text-lg font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
          Fujiventura
        </Link>
        {started && state === "frage" && (
          <p className="text-on-table-2 text-sm tabular-nums" aria-live="polite">
            {i + 1} / {steps.length}
          </p>
        )}
      </header>
      {started && state === "frage" && (
        <div aria-hidden className="mx-4 mt-3 h-px bg-on-table-2/30 md:mx-8">
          <div className="h-px origin-left bg-mark transition-transform duration-500 ease-out" style={{ transform: `scaleX(${i / steps.length})` }} />
        </div>
      )}

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-10">
        {!started ? (
          <div>
            <h1 className="text-on-table text-4xl leading-tight font-bold tracking-[-0.03em]" style={{ fontVariationSettings: '"wdth" 80' }}>
              Was ist dir bei Fotobüchern wichtig?
            </h1>
            <p className="text-on-table-2 mt-4 text-base leading-relaxed">
              {steps.length} kurze Fragen, etwa zwei Minuten. Zu jeder Eigenschaft fragen wir zweimal: wie du es fändest, wenn es sie gibt, und wenn
              nicht. Es gibt kein Richtig oder Falsch. Anonym, ohne Konto.
            </p>
            <fieldset className="mt-8">
              <legend className="text-on-table text-sm font-semibold">Womit fotografierst du meistens? (freiwillig)</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["handy", "Handy"],
                  ["kamera", "Kamera"],
                  ["beides", "Beides"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={camera === id}
                    onClick={() => setCamera(camera === id ? null : id)}
                    className={`border px-4 py-2 text-sm transition-colors duration-150 ${camera === id ? "border-on-table bg-on-table text-table" : "border-on-table-2/60 text-on-table"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="border-on-table text-on-table hover:bg-on-table hover:text-table mt-10 border px-5 py-3 font-semibold transition-colors duration-150"
            >
              Los geht’s
            </button>
          </div>
        ) : state === "frage" ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={i}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-on-table-2 text-sm">{s.kind === "f" ? "Wenn es das gibt" : "Wenn es das nicht gibt"}</p>
              <h1
                // neue Frage: der Fokus springt auf sie, sobald sie nach dem Wechsel erscheint, nicht auf body
                ref={(el) => el?.focus({ preventScroll: true })}
                tabIndex={-1} className="text-on-table mt-2 text-2xl leading-snug font-semibold tracking-[-0.01em] outline-none md:text-3xl">
                {s.text}
              </h1>
              <ul className="mt-8 grid gap-2">
                {ANSWERS.map((a, n) => (
                  <li key={a}>
                    <button
                      type="button"
                      aria-pressed={chosen === n}
                      onClick={() => answer(n)}
                      className={`text-on-table hover:border-on-table hover:bg-on-table/5 flex w-full items-baseline gap-3 border px-4 py-3 text-left text-base transition-colors duration-150 ${chosen === n ? "border-on-table bg-on-table/10" : "border-on-table-2/50"}`}
                    >
                      <span aria-hidden className="text-on-table-2 text-sm tabular-nums">
                        {n + 1}
                      </span>
                      {a}
                      {chosen === n && <span className="text-on-table-2 ml-auto text-sm">deine Antwort</span>}
                    </button>
                  </li>
                ))}
              </ul>
              {i > 0 && (
                <button type="button" onClick={() => setI(i - 1)} className="text-on-table-2 mt-6 text-sm underline underline-offset-4">
                  Zurück
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div aria-live="polite">
            <h1 className="text-on-table text-4xl leading-tight font-bold tracking-[-0.03em]" style={{ fontVariationSettings: '"wdth" 80' }}>
              {state === "sendet" ? "Wird gespeichert …" : state === "fertig" ? "Danke!" : "Das hat nicht geklappt."}
            </h1>
            {state === "fertig" && (
              <p className="text-on-table-2 mt-4 text-base leading-relaxed">
                Deine Antworten fließen direkt in die Auswertung.{" "}
                <Link href="/qfd#kano" className="text-on-table underline decoration-mark decoration-2 underline-offset-4">
                  Zum Ergebnis
                </Link>
              </p>
            )}
            {state === "fehler" && (
              <button type="button" onClick={() => send(answers)} className="text-on-table mt-4 underline decoration-mark decoration-2 underline-offset-4">
                Nochmal senden
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
