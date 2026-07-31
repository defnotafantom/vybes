"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { blurDataUrl } from "@/lib/blur";
import { cn } from "@/lib/cn";

/**
 * Immagine con segnaposto sfocato e ripiego in caso di errore.
 *
 * Il caso che gestisce e che `next/image` da solo non gestisce: un file
 * caricato dagli utenti può sparire dallo storage o avere un URL rotto. Senza
 * ripiego resta un rettangolo vuoto senza spiegazione; qui compare un
 * segnaposto onesto che dice che l'immagine non è disponibile.
 */
export function OptimizedImage({
  className,
  alt,
  wrapperClassName,
  ...props
}: ImageProps & { wrapperClassName?: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  if (state === "error") {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-1 bg-black/[0.03] text-ink-muted dark:bg-white/[0.04]",
          wrapperClassName
        )}
        role="img"
        aria-label={`${alt} — immagine non disponibile`}
      >
        <ImageOff className="h-5 w-5" aria-hidden="true" />
        <span className="text-[11px]">Immagine non disponibile</span>
      </div>
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      placeholder="blur"
      blurDataURL={blurDataUrl()}
      onLoad={() => setState("ready")}
      onError={() => setState("error")}
      className={cn(
        "transition-opacity duration-300",
        state === "loading" ? "opacity-0" : "opacity-100",
        className
      )}
    />
  );
}
