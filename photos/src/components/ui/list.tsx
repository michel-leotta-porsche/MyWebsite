import Link from "next/link";
import type { ReactNode } from "react";

// Gruppierte Liste wie in den iPhone-Einstellungen: eine Fläche, Zeilen mit Symbol, Titel, Zeile darunter und Pfeil.
// Für Konto, Hingelegt-für, Einstellungen. Kein "use client": geht auch in Server-Komponenten.

export function ListGroup({ children, label, className = "" }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <ul aria-label={label} className={`bg-on-table/5 overflow-hidden rounded-tool shadow-[inset_0_0_0_1px_rgb(236_230_220/0.08)] ${className}`}>
      {children}
    </ul>
  );
}

type RowProps = {
  /** Symbol (Lucide) oder Einband-Miniatur links */
  lead?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  /** rechts: Status-Pille, Zahl, Schalter */
  trail?: ReactNode;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
};

const ROW =
  "relative flex min-h-[58px] w-full items-center gap-3.5 px-3.5 py-3 text-left transition-colors duration-150 active:bg-on-table/8 [li+li>&]:before:absolute [li+li>&]:before:top-0 [li+li>&]:before:right-0 [li+li>&]:before:left-[62px] [li+li>&]:before:h-px [li+li>&]:before:bg-on-table/8";

export function ListRow({ lead, title, detail, trail, href, onClick, danger = false }: RowProps) {
  const chevron = href || onClick;
  const inner = (
    <>
      {lead && <span className="text-on-table-2 grid w-[34px] shrink-0 place-items-center [&_svg]:size-5">{lead}</span>}
      <span className="min-w-0 flex-1">
        <span className={`block text-base font-semibold ${danger ? "text-danger-on-table" : "text-on-table"}`}>{title}</span>
        {detail && <span className="text-on-table-2 mt-0.5 block text-[13px]">{detail}</span>}
      </span>
      {trail}
      {chevron && (
        <svg aria-hidden viewBox="0 0 24 24" className="text-on-table-2 size-4 shrink-0 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      )}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className={ROW}>
          {inner}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={ROW}>
          {inner}
        </button>
      ) : (
        <div className={ROW}>{inner}</div>
      )}
    </li>
  );
}

/** Kleine Status-Pille; Status steht immer auch als Wort da, nie nur als Farbe */
export function StatusPill({ children, fresh = false }: { children: ReactNode; fresh?: boolean }) {
  return (
    <span className="bg-on-table/8 text-on-table inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold">
      <span aria-hidden className={`size-1.5 rounded-full ${fresh ? "bg-cloth motion-safe:animate-pulse" : "bg-on-table-2"}`} />
      {children}
    </span>
  );
}
