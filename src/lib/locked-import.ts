"use client";

import { CalimaCamera, takeShot } from "@/lib/camera";
import { dayStack } from "@/lib/day-stack";
import { t } from "@/lib/i18n";
import { editFor, LOCKED_KEY, readLockedLooks } from "@/lib/locked";
import { newId } from "@/lib/store";
import type { Print } from "@/lib/studio-store";

/**
 * Gesperrt aufgenommene Fotos (#187) abholen und zu Abzügen machen: Stapel ihres Tages, Look aus der Auswahl, die die
 * Calima-Kamera zuletzt geteilt hat. Einmal abgeholt liegen sie nicht mehr bei der App.
 */
export async function takeLockedShots(): Promise<Print[]> {
  const { shots } = await CalimaCamera.takeLocked();
  if (!shots?.length) return [];
  let looks: ReturnType<typeof readLockedLooks> = [];
  try {
    looks = readLockedLooks(localStorage.getItem(LOCKED_KEY));
  } catch {}
  const { studioSource } = await import("@/lib/ingest");
  const ps: Print[] = [];
  for (const [i, shot] of shots.entries()) {
    const when = new Date(shot.at).toISOString().slice(0, 19).replace("T", " ").replaceAll(":", "-");
    const file = await takeShot(shot.path, `${t("Kamera")} ${when} ${i + 1}`).catch(() => null);
    const s = file && (await studioSource(file).catch(() => null));
    if (!file || !s) continue;
    ps.push({ id: newId(), name: file.name.replace(/\.jpg$/, ""), at: shot.at, w: s.w, h: s.h, work: s.work, page: s.page, thumb: s.thumb, meta: s.meta, edit: editFor(shot, looks), stack: dayStack(shot.at), pos: shot.at });
  }
  return ps;
}
