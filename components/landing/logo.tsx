"use client";

/**
 * Traced from the brand book's reference renders (LOGO chapnet BRAND.pdf) —
 * nested open "C" circuit brackets: the outer bracket ends in two rounded
 * pill terminals, the inner bracket branches to two hollow ring nodes, plus
 * two small floating "comma" accents. currentColor so it works both as the
 * white mark on a brand-gradient background and as a colored mark on light UI.
 */
export function ChapnetMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M84 8
           C 68 -2, 46 -4, 28 6
           C 6 18, -2 42, 8 64
           C 18 86, 42 98, 64 94
           C 74 92, 80 98, 86 104"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M68 28
           C 56 20, 42 20, 33 28
           C 22 38, 22 58, 33 68
           C 42 76, 56 76, 66 70"
        stroke="currentColor"
        strokeWidth="9.5"
        strokeLinecap="round"
      />
      <path d="M68 28 L92 20" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="98" cy="17" r="8" stroke="currentColor" strokeWidth="5" />
      <path d="M66 70 L92 88" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="98" cy="92" r="8" stroke="currentColor" strokeWidth="5" />
      <path d="M48 42 C 41 42, 39 49, 46 51" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
      <path d="M46 68 C 53 70, 58 65, 53 58" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

export function ChapnetWordmark({ className = "text-2xl" }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-tight brand-gradient-text ${className}`}>
      Chapnet
    </span>
  );
}

export function ChapnetLogo({ markClassName = "w-8 h-8", wordmarkClassName = "text-2xl", className = "" }: {
  markClassName?: string;
  wordmarkClassName?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-[color:var(--brand-purple)]">
        <ChapnetMark className={markClassName} />
      </span>
      <ChapnetWordmark className={wordmarkClassName} />
    </span>
  );
}
