"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { IS_APP } from "@/lib/app-mode";

// Quick Action am App-Symbol: „Ins Reisebuch fotografieren“ (Info.plist, SceneDelegate.swift) öffnet Calimas Kamera im
// Bücherzimmer, beim Kaltstart wie aus dem Hintergrund. Die App hält die Aktion fest, bis diese Seite sie abholt.
// Liegt das Fotostudio schon offen da, übernimmt es selbst; sonst geht es ins Zimmer mit ?kamera=1.

export function AppLaunch() {
  const router = useRouter();
  useEffect(() => {
    if (!IS_APP) return;
    let alive = true;
    let remove: (() => void) | undefined;
    (async () => {
      const { CalimaCamera, OPEN_CAMERA } = await import("@/lib/camera");
      const take = async () => {
        const { action } = await CalimaCamera.launch().catch(() => ({ action: undefined }));
        if (!alive || action !== "kamera") return;
        if (!window.dispatchEvent(new Event(OPEN_CAMERA, { cancelable: true }))) return;
        // im Zimmer, aber ein Buch ist aufgeschlagen: das Zimmer neu laden, die Kamera kommt mit. Mit dem Router bliebe
        // das Buch offen (es hängt am #, nicht am Pfad).
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- gewollt ganz neu
        if (location.pathname.startsWith("/zimmer")) location.assign("/zimmer?kamera=1");
        else router.push("/zimmer?kamera=1");
      };
      const sub = await CalimaCamera.addListener("event", (e) => {
        if (e.name === "launch") void take();
      });
      if (!alive) return void sub.remove();
      remove = () => void sub.remove();
      void take();
    })().catch(() => {});
    return () => {
      alive = false;
      remove?.();
    };
  }, [router]);
  return null;
}
