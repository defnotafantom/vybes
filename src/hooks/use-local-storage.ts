"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Stato persistito in localStorage.
 *
 * Il valore iniziale è sempre `initial`, anche se in storage c'è altro: il
 * server non ha accesso a localStorage e leggerlo durante il primo render
 * causerebbe un mismatch di idratazione. Il valore vero arriva subito dopo,
 * nell'effect.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* storage non disponibile o JSON corrotto: si tiene il default */
    } finally {
      setLoaded(true);
    }
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* quota piena o modalità privata: il valore resta in memoria */
        }
        return resolved;
      });
    },
    [key]
  );

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* niente da fare */
    }
    setValue(initial);
  }, [key, initial]);

  return { value, setValue: update, remove, loaded } as const;
}
