import Link from "next/link"

/* 404 innerhalb der Sprachpfade. Zweisprachig, weil die Sprache hier nicht sicher bekannt ist. */
export default function NotFound() {
  return (
    <div className="px-gutter pt-[clamp(56px,9vw,120px)]">
      <span className="t-label text-ink-3">404</span>
      <h1 className="t-display mt-4 max-w-[16ch]">Diese Seite gibt es nicht. This page does not exist.</h1>
      <p className="mt-8 flex gap-6">
        <Link href="/de" className="border-b border-line pb-0.5 font-medium hover:border-ink">Zur Startseite</Link>
        <Link href="/en" className="border-b border-line pb-0.5 font-medium hover:border-ink">Home</Link>
      </p>
    </div>
  )
}
