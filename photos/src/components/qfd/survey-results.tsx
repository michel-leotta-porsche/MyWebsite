"use client";

import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";

import { KANO, kanoOf, qfd } from "@/content/qfd";
import { db } from "@/lib/firebase";

type Response = { answers: Record<string, [number, number]>; camera?: string };

const LABEL: Record<string, string> = { A: "Begeisterung", O: "Leistung", M: "Basis", I: "egal", R: "Ablehnung", Q: "fraglich" };

/** Live-Auswertung: Häufigste Kano-Kategorie je Anforderung, mit Zufriedenheits- und Unzufriedenheitsindex nach Berger */
export function SurveyResults() {
  const [rs, setRs] = useState<Response[] | null>(null);
  useEffect(() => {
    let alive = true;
    getDocs(collection(db(), "kano"))
      .then((s) => alive && setRs(s.docs.map((d) => d.data() as Response)))
      .catch(() => alive && setRs([]));
    return () => {
      alive = false;
    };
  }, []);

  const reqs = new Map(qfd.reqs.requirements.map((r) => [r.id, r]));
  if (rs === null) return <p className="text-on-table-2 mt-6 text-sm">Lade Antworten …</p>;
  if (!rs.length)
    return <p className="text-on-table-2 mt-6 text-sm">Noch keine Antworten. Sobald Freunde den Fragebogen ausfüllen, steht hier das echte Ergebnis neben der Annahme.</p>;

  return (
    <div className="mt-8">
      <p className="text-on-table-2 text-sm">{rs.length} Antworten</p>
      <div tabIndex={0} className="mt-3 overflow-x-auto" aria-label="Tabelle Kano-Ergebnisse">
        <table className="w-full min-w-[760px] text-left text-sm tabular-nums">
          <thead>
            <tr className="text-on-table-2 border-b border-on-table">
              <th className="py-2 pr-3 font-normal">Anforderung</th>
              <th className="py-2 pr-3 font-normal">Annahme</th>
              <th className="py-2 pr-3 font-normal">Ergebnis</th>
              <th className="py-2 pr-3 text-right font-normal">Zufriedenheit</th>
              <th className="py-2 text-right font-normal">Unzufriedenheit</th>
            </tr>
          </thead>
          <tbody>
            {qfd.features.survey.map((q) => {
              const counts: Record<string, number> = { A: 0, O: 0, M: 0, I: 0, R: 0, Q: 0 };
              for (const r of rs) {
                const a = r.answers?.[q.req];
                if (a) counts[kanoOf(a[0], a[1])]++;
              }
              const total = counts.A + counts.O + counts.M + counts.I;
              const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
              const req = reqs.get(q.req);
              // Berger et al.: CS+ = (A+O)/(A+O+M+I), CS− = −(O+M)/(A+O+M+I)
              const plus = total ? (counts.A + counts.O) / total : 0;
              const minus = total ? -(counts.O + counts.M) / total : 0;
              return (
                <tr key={q.req} className="border-b border-on-table-2/25">
                  <td className="text-on-table py-2.5 pr-3">
                    <span className="text-on-table-2 mr-2">{q.req}</span>
                    {req?.text}
                  </td>
                  <td className="text-on-table-2 py-2.5 pr-3">{req ? KANO[req.kano].short : "–"}</td>
                  <td className="text-on-table py-2.5 pr-3 font-semibold">{top[1] ? LABEL[top[0]] : "–"}</td>
                  <td className="text-on-table py-2.5 pr-3 text-right">{plus.toFixed(2)}</td>
                  <td className="text-on-table py-2.5 text-right">{minus.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
