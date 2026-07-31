"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

/**
 * Barra di avanzamento in cima durante i cambi di pagina.
 *
 * Con il rendering sul server la navigazione può impiegare qualche centinaio
 * di millisecondi prima che compaia qualcosa: senza un segnale, l'utente
 * pensa che il clic non sia stato registrato e clicca di nuovo.
 *
 * La barra avanza in modo asintotico e non raggiunge mai il 100% da sola:
 * arriva a fondo solo quando la pagina è davvero cambiata. Mostrare "100%"
 * mentre si sta ancora caricando è peggio che non mostrare niente.
 */
function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Il cambio di rotta è già avvenuto: si completa e si nasconde.
    setProgress(100);
    const hide = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 260);
    return () => clearTimeout(hide);
  }, [pathname, searchParams]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const link = (e.target as HTMLElement).closest?.("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href?.startsWith("/")) return;
      if (link.getAttribute("target") === "_blank") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (href === window.location.pathname + window.location.search) return;

      setVisible(true);
      setProgress(12);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  useEffect(() => {
    if (!visible || progress >= 90) return;
    // Avanzamento che rallenta man mano: non promette un completamento
    // che non possiamo garantire.
    const timer = setTimeout(() => setProgress((p) => p + (90 - p) * 0.18), 180);
    return () => clearTimeout(timer);
  }, [visible, progress]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5"
      role="progressbar"
      aria-label="Caricamento della pagina"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-brand-500 shadow-glow transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function NavProgress() {
  // useSearchParams richiede un confine di Suspense nel rendering statico.
  return (
    <Suspense fallback={null}>
      <ProgressBar />
    </Suspense>
  );
}
