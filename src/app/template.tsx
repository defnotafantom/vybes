"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Transizione tra le pagine.
 *
 * `template.tsx` (a differenza di `layout.tsx`) viene rimontato a ogni
 * navigazione: è il punto giusto per animare l'ingresso del contenuto.
 *
 * Il dettaglio che conta per la SEO: **il primo caricamento non viene
 * animato**. Un fade-in da opacity 0 ritarda il momento in cui il browser
 * dipinge l'elemento più grande, e quel momento è esattamente ciò che misura
 * l'LCP. Animare l'ingresso costerebbe qualche centinaio di millisecondi su
 * una metrica che Google usa come segnale di ranking.
 *
 * Le navigazioni successive sono già interattive e l'utente ha appena
 * cliccato: lì l'animazione aiuta a capire che è cambiato qualcosa, e non
 * viene misurata da nessuno.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setAnimate(true);
  }, [pathname]);

  return (
    <div
      key={pathname}
      className={animate ? "animate-fade-up" : undefined}
      // La barra di scorrimento non deve saltare durante l'animazione
      style={{ minHeight: "1px" }}
    >
      {children}
    </div>
  );
}
