import { IS_APP } from "@/lib/app-mode";

// Teilen, Kopieren und Dateien sichern: in der iPhone-App über die nativen Plugins, im Browser über die Web-APIs.
// In der App verfällt der Tipp nach einem Netzaufruf, navigator.share scheitert dann still (Workshop Paket 6);
// das Plugin braucht keinen frischen Tipp. Ergebnis immer ehrlich: geteilt, abgebrochen oder fehlgeschlagen.

export type ShareResult = "shared" | "cancelled" | "failed";

const cancelled = (e: unknown) => /cancel|abort/i.test(String((e as Error)?.name ?? "") + String((e as Error)?.message ?? e));

/** Link ins Teilen-Blatt geben */
export async function shareLink({ title, text, url }: { title: string; text: string; url: string }): Promise<ShareResult> {
  try {
    if (IS_APP) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, text, url, dialogTitle: title });
      return "shared";
    }
    if (!navigator.share) return "failed";
    await navigator.share({ title, text, url });
    return "shared";
  } catch (e) {
    return cancelled(e) ? "cancelled" : "failed";
  }
}

/** Text in die Zwischenablage; false, wenn es nicht geklappt hat */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (IS_APP) {
      const { Clipboard } = await import("@capacitor/clipboard");
      await Clipboard.write({ string: text });
      return true;
    }
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Dateiname ohne Pfadzeichen, damit ein Titel wie „../a“ nichts außerhalb des Ordners anlegt */
export const safeFileName = (name: string, ext: string) =>
  (name.normalize("NFC").replace(/[^\p{L}\p{N} _-]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 40) || "Calima") + ext;

/**
 * Datei sichern. Im Browser als Download; in der App als Datei im Cache, die ins Teilen-Blatt geht
 * („In Dateien sichern“, AirDrop, Mail) und danach wieder gelöscht wird.
 */
export async function saveFile(name: string, data: string | Blob, mime: string): Promise<ShareResult> {
  if (!IS_APP) {
    const url = URL.createObjectURL(typeof data === "string" ? new Blob([data], { type: mime }) : data);
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return "shared";
  }
  const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
  const path = `export/${name}`;
  try {
    // Text als UTF-8, Bilder als Base64 (das Plugin nimmt Binärdaten nur so)
    const { uri } =
      typeof data === "string"
        ? await Filesystem.writeFile({ path, data, directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true })
        : await Filesystem.writeFile({ path, data: await base64(data), directory: Directory.Cache, recursive: true });
    await Share.share({ files: [uri], title: name });
    return "shared";
  } catch (e) {
    return cancelled(e) ? "cancelled" : "failed";
  } finally {
    Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {});
  }
}

const base64 = (b: Blob) =>
  new Promise<string>((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",", 2)[1] ?? "");
    r.onerror = () => fail(r.error);
    r.readAsDataURL(b);
  });
