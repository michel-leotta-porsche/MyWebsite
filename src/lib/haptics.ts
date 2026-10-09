import { IS_APP } from "@/lib/app-mode";

// Kurzes Klopfen in der iPhone-App: Auswahl, Druck auf einen Knopf, geschafft. Im Browser passiert nichts.

export type HapticKind = "tap" | "select" | "success";

export function haptic(kind: HapticKind = "tap") {
  if (!IS_APP) return;
  import("@capacitor/haptics")
    .then(({ Haptics, ImpactStyle, NotificationType }) => {
      if (kind === "select") return Haptics.selectionChanged();
      if (kind === "success") return Haptics.notification({ type: NotificationType.Success });
      return Haptics.impact({ style: ImpactStyle.Light });
    })
    .catch(() => {});
}
