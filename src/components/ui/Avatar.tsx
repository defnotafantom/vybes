import Image from "next/image";
import { cn } from "@/lib/cn";

const SIZES = {
  xs: { box: "h-7 w-7", text: "text-xs", px: 28 },
  sm: { box: "h-9 w-9", text: "text-sm", px: 36 },
  md: { box: "h-12 w-12", text: "text-base", px: 48 },
  lg: { box: "h-16 w-16", text: "text-xl", px: 64 },
  xl: { box: "h-28 w-28", text: "text-4xl", px: 112 },
} as const;

/**
 * Avatar con ripiego sulle iniziali.
 *
 * Il colore di sfondo è derivato dal nome, non casuale: lo stesso utente ha
 * sempre la stessa tinta in tutta l'applicazione, il che rende i profili
 * riconoscibili a colpo d'occhio anche senza foto.
 */
const TINTS = [
  "bg-brand-100 text-brand-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

function tintFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
}

export function Avatar({
  name,
  src,
  size = "md",
  rounded = "full",
  priority = false,
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  rounded?: "full" | "xl";
  priority?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  const shape = rounded === "full" ? "rounded-full" : "rounded-2xl";

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden", s.box, shape, !src && tintFor(name), className)}
    >
      {src ? (
        <Image
          src={src}
          alt={`Foto di ${name}`}
          fill
          sizes={`${s.px}px`}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn("flex h-full w-full items-center justify-center font-bold", s.text)}
        >
          {name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </div>
  );
}
