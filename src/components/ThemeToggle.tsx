"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Script inline eseguito prima del paint: applica il tema salvato senza
 * far lampeggiare la pagina (evita il flash of incorrect theme).
 */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('vybes-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d))document.documentElement.classList.add('dark');}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("vybes-theme", next ? "dark" : "light");
    } catch {
      /* storage non disponibile: il tema resta valido per la sessione */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn-ghost px-2"
      aria-label={dark ? "Passa al tema chiaro" : "Passa al tema scuro"}
      aria-pressed={mounted ? dark : undefined}
    >
      {mounted && dark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
