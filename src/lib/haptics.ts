import { IS_APP } from "@/lib/app-mode";

// Kurzes Klopfen in der iPhone-App, nur bei echten Momenten (Workshop Paket 6): Hauptknopf, Einrasten,
// Blatt liegt, langes Drücken, geschafft, Fehler. Im Browser passiert nichts.
// Aufrufer lösen nur beim Wechsel eines Zustands aus, nie pro Bewegung; dazu hier ein Mindestabstand.

export type HapticKind = "tap" | "select" | "press" | "success" | "warning";

const GAP_MS = 80;
let last = 0;
let plugin: Promise<typeof import("@capacitor/haptics")> | null = null;
const load = () => (plugin ??= import("@capacitor/haptics"));

/** Plugin vorab laden, z. B. beim Greifen eines Fotos, damit das erste Einrasten nicht verzögert klopft */
export function warmHaptics() {
  if (IS_APP) load().catch(() => {});
}

export function haptic(kind: HapticKind = "tap") {
  if (!IS_APP) return;
  const now = performance.now();
  if (now - last < GAP_MS) return;
  last = now;
  load()
    .then(({ Haptics, ImpactStyle, NotificationType }) => {
      if (kind === "select") return Haptics.selectionChanged();
      if (kind === "success") return Haptics.notification({ type: NotificationType.Success });
      if (kind === "warning") return Haptics.notification({ type: NotificationType.Warning });
      return Haptics.impact({ style: kind === "press" ? ImpactStyle.Medium : ImpactStyle.Light });
    })
    .catch(() => {});
}
