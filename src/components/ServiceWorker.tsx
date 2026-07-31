"use client";

import { useEffect } from "react";

/**
 * Registra il service worker in produzione.
 * Serve solo a rendere installabile la PWA e a mostrare una pagina decente
 * offline: non mette in cache le pagine dinamiche, perché servire dalla cache
 * un feed o un elenco di ingaggi vecchio di giorni è peggio di un errore.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((e) => console.warn("[sw] registrazione non riuscita", e));
    };

    // Dopo il load: la registrazione non deve competere con il first paint.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
