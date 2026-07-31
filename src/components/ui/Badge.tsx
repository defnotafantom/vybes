import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/cn";

const TONES = {
  brand: "bg-brand-500/12 text-brand-700 border-brand-500/25 dark:text-brand-300",
  green: "bg-emerald-500/12 text-emerald-700 border-emerald-500/25 dark:text-emerald-300",
  amber: "bg-amber-500/12 text-amber-700 border-amber-500/25 dark:text-amber-300",
  neutral: "bg-black/[0.04] text-ink-muted border-line dark:bg-white/[0.06]",
  red: "bg-red-500/12 text-red-700 border-red-500/25 dark:text-red-300",
} as const;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Artista o organizzatore: il ruolo di prodotto, non quello di moderazione. */
export function RoleBadge({ role, className }: { role?: string | null; className?: string }) {
  const meta =
    role === "RECRUITER"
      ? { label: "Organizzatore", tone: "green" as const }
      : { label: "Artista", tone: "brand" as const };

  return (
    <Badge tone={meta.tone} className={className}>
      {meta.label}
    </Badge>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center text-brand-600", className)}
      title="Profilo verificato"
    >
      <BadgeCheck className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">Profilo verificato</span>
    </span>
  );
}
