// Der Schnitt: ein Abschnitt pro Regel. Die Grenzen kommen aus dem Drehbuch (Feld `rule` der
// ersten Zeile eines Abschnitts in data/lyrics.json); geschnitten wird 0,3 s vor dem ersten Wort.
import type { TimelineEntry } from './engine/engine';
import type { SceneClass } from './engine/scene';
import type { Lyrics } from './engine/lyrics';
import type { AudioData } from './engine/audio';

const modules = import.meta.glob<{ default: SceneClass }>('./scenes/*.ts');
const scene = (name: string) => () => {
  const m = modules[`./scenes/${name}.ts`];
  return m ? m() : Promise.reject(new Error(`scene module not found: scenes/${name}.ts`));
};

export function makeTimeline(ly: Lyrics, au: AudioData): TimelineEntry[] {
  const heads = (ly.lines as (typeof ly.lines[number] & { rule?: string | null })[]).filter((l) => l.rule);
  const cut = (i: number) => (i === 0 ? 0 : Math.max(0, heads[i]!.start - 0.3));
  return heads.map((l, i) => ({
    id: l.rule!,
    load: scene('lab'),
    start: cut(i),
    end: i + 1 < heads.length ? cut(i + 1) : au.duration,
    params: { rule: l.rule },
  }));
}
