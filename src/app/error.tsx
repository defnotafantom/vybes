"use client";

import { useEffect } from "react";

/** Error boundary di route: intercetta gli errori di rendering server e client. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Punto di innesto per Sentry / logging strutturato.
    console.error("[route-error]", error.digest, error.message);
  }, [error]);

  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold">Qualcosa è andato storto</h1>
      <p className="mx-auto mt-3 max-w-md muted">
        L&apos;errore è stato registrato. Puoi riprovare: se persiste, riproveremo noi.
      </p>
      {error.digest && <p className="mt-2 text-xs muted">Codice: {error.digest}</p>}
      <button type="button" onClick={reset} className="btn-primary mt-8">Riprova</button>
    </div>
  );
}
