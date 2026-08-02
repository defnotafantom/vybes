"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

const ToastContext = createContext<{
  push: (message: string, kind?: ToastKind) => void;
} | null>(null);

/**
 * Notifiche temporanee.
 *
 * ── Perché il contenitore non ha più `role="status"` ──
 *
 * Ce l'aveva, ed era un `role="status"` **sempre presente e quasi sempre
 * vuoto**, in fondo a ogni pagina del sito. Due conseguenze.
 *
 * Per chi naviga a voce: una regione live vuota è rumore: compare
 * nell'elenco delle regioni, si può raggiungere, e non contiene niente.
 *
 * Per chi cerca un messaggio di stato — un test automatico, ma anche uno
 * screen reader che salta di regione in regione — la pagina ne dichiara due
 * con lo stesso ruolo: quello vero e questo. La suite lo ha scoperto così,
 * con uno «strict mode violation» su una pagina in cui il messaggio giusto
 * c'era e veniva mostrato correttamente.
 *
 * Ora `aria-live` resta sul contenitore — deve esistere *prima* del
 * messaggio, altrimenti l'inserimento non viene annunciato — mentre il ruolo
 * sta su ogni singola notifica, che è la cosa che ha davvero uno stato da
 * comunicare.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex animate-slide-in-right items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-float ${
              t.kind === "success"
                ? "border-green-300 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100"
                : t.kind === "error"
                  ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
                  : "border-brand-300 bg-brand-50 text-brand-900 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-100"
            }`}
          >
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              aria-label="Chiudi notifica"
              className="opacity-60 hover:opacity-100"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast va usato dentro <ToastProvider>");
  return ctx;
}
