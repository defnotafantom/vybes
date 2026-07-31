import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Logo vettoriale.
 *
 * L'originale usava framer-motion per farlo ruotare all'hover. Qui la stessa
 * cosa la fanno due transizioni CSS: framer-motion pesa circa 50 kB gzip e
 * finirebbe nel bundle di ogni singola pagina, incluse quelle che devono
 * caricarsi in fretta per la SEO. Un logo non vale mezzo megabit.
 *
 * L'onda dentro il marchio richiama la forma d'onda audio: è il segno più
 * riconoscibile per una piattaforma di artisti musicali.
 */
export function LogoMark({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8", className)}
      role="img"
      aria-label="Vybes"
    >
      <defs>
        <linearGradient id="vybes-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
      </defs>

      <rect width="32" height="32" rx="8" fill="url(#vybes-mark)" />

      {/* Forma d'onda: le barre centrali sono più alte, come in un livello audio */}
      <g
        fill="white"
        className={cn(animated && "origin-center transition-transform duration-500 ease-out")}
      >
        <rect x="7" y="14" width="2.5" height="4" rx="1.25" opacity="0.75" />
        <rect x="11.5" y="10" width="2.5" height="12" rx="1.25" opacity="0.9" />
        <rect x="16" y="7" width="2.5" height="18" rx="1.25" />
        <rect x="20.5" y="11" width="2.5" height="10" rx="1.25" opacity="0.9" />
        <rect x="25" y="14.5" width="2.5" height="3" rx="1.25" opacity="0.75" />
      </g>
    </svg>
  );
}

export function Logo({
  href = "/",
  withText = true,
  className,
}: {
  href?: string | null;
  withText?: boolean;
  className?: string;
}) {
  const content = (
    <span className={cn("group inline-flex items-center gap-2", className)}>
      <LogoMark className="h-8 w-8 transition-transform duration-300 ease-out group-hover:scale-105 group-hover:-rotate-3" />
      {withText && (
        <span className="text-lg font-bold tracking-tight">
          <span className="text-brand-600">Vy</span>bes
        </span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="rounded-lg transition-opacity hover:opacity-90">
      {content}
    </Link>
  );
}
