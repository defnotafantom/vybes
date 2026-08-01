"use client";

import { useRef } from "react";

/**
 * Riflettore che segue il cursore.
 *
 * Aggiorna due variabili CSS invece di manipolare stili: il browser
 * ridipinge solo il gradiente, senza ricalcolare il layout. Ed è l'unico
 * JavaScript di tutta la landing.
 *
 * Su touch non fa niente — non c'è un cursore da seguire — ed è corretto
 * così: l'effetto è una rifinitura, non un contenuto.
 */
export function Spotlight({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className={`spotlight ${className}`}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--px", `${e.clientX - r.left}px`);
        el.style.setProperty("--py", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}