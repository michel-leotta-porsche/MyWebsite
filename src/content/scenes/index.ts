import type { Scene } from "@/components/wiki/tw"
import { commitSplit, fixupFold } from "./git-commits"

/*
 * Alle Szenen nach Namen. MDX übergibt nur den Namen (Server → Client),
 * die Szene selbst lebt im Client-Bundle.
 */
export const scenes = {
  "git-commits/split": commitSplit,
  "git-commits/fixup": fixupFold,
} as unknown as Record<string, Scene<Record<string, unknown>, unknown>>
