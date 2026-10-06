"use client";

import { useEffect, useState } from "react";

import { Book } from "@/components/book";

/**
 * Zwei Bindungen desselben Buchs: Doppelseiten ab Tablet, Einzelseiten zum Wischen auf dem Telefon.
 * Der Server liefert beide (CSS trennt sie), nach dem Laden bleibt nur die passende im DOM,
 * damit das Telefon nicht zwei Bücher voller Bilder im Speicher hält.
 */
export function Books() {
  const [wide, setWide] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <>
      {wide !== false && <Book mode="spread" className="hidden md:block" />}
      {wide !== true && <Book mode="single" className="md:hidden" />}
    </>
  );
}
