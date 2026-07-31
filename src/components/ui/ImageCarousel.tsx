"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { cn } from "@/lib/cn";

/**
 * Carosello su scroll-snap nativo.
 *
 * Nessuna libreria: il browser fa già lo scorrimento fluido, l'inerzia sul
 * touch e l'aggancio alle slide. Una libreria di caroselli pesa fra i 15 e i
 * 30 kB per riprodurre in JavaScript quello che il CSS fa da solo — e di
 * norma peggio, perché reimplementa lo scroll invece di usarlo.
 */
export function ImageCarousel({
  images,
  aspect = "aspect-[16/9]",
}: {
  images: { url: string; alt: string }[];
  aspect?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;
  if (images.length === 1) {
    return (
      <div className={cn("relative overflow-hidden rounded-xl bg-brand-50 dark:bg-white/5", aspect)}>
        <OptimizedImage src={images[0].url} alt={images[0].alt} fill sizes="100vw" className="object-cover" />
      </div>
    );
  }

  function goTo(next: number) {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(next, images.length - 1));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
    setIndex(clamped);
  }

  return (
    <div className="group relative">
      <div
        ref={trackRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((img, i) => (
          <div key={i} className={cn("relative w-full flex-none snap-center bg-brand-50 dark:bg-white/5", aspect)}>
            <OptimizedImage
              src={img.url}
              alt={img.alt}
              fill
              sizes="100vw"
              className="object-cover"
              // Solo la prima immagine è visibile all'apertura.
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Immagine precedente"
        onClick={() => goTo(index - 1)}
        disabled={index === 0}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/75 focus-visible:opacity-100 disabled:opacity-0 group-hover:opacity-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Immagine successiva"
        onClick={() => goTo(index + 1)}
        disabled={index === images.length - 1}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/75 focus-visible:opacity-100 disabled:opacity-0 group-hover:opacity-100"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Vai all'immagine ${i + 1} di ${images.length}`}
            aria-current={i === index}
            onClick={() => goTo(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-200",
              i === index ? "w-5 bg-white" : "w-1.5 bg-white/55 hover:bg-white/80"
            )}
          />
        ))}
      </div>
    </div>
  );
}
