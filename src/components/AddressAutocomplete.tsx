"use client";

import { useEffect, useRef, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import type { GeocodeResult } from "@/app/api/geocoding/route";

/**
 * Ricerca indirizzi con selezione delle coordinate.
 * Le coordinate restano modificabili a mano nel form: l'autocomplete è una
 * scorciatoia, non l'unica strada.
 */
export function AddressAutocomplete({
  defaultValue = "",
  onSelect,
}: {
  defaultValue?: string;
  onSelect: (result: GeocodeResult) => void;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const skipNext = useRef(false);
  const debounced = useDebounce(query, 400);

  useEffect(() => {
    // Dopo una selezione il campo cambia valore: non va rilanciata la ricerca.
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    if (debounced.trim().length < 3) {
      setResults([]);
      return;
    }

    let alive = true;
    setLoading(true);
    fetch(`/api/geocoding?q=${encodeURIComponent(debounced.trim())}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive) return;
        setResults(j?.data?.results ?? []);
        setOpen(true);
        setHighlight(-1);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [debounced]);

  function choose(r: GeocodeResult) {
    skipNext.current = true;
    setQuery(r.label);
    setOpen(false);
    setResults([]);
    onSelect(r);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlight >= 0) {
      e.preventDefault();
      choose(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <label htmlFor="address-search" className="mb-1 block text-sm font-medium">
        Cerca l&apos;indirizzo
      </label>
      <input
        id="address-search"
        type="text"
        className="input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Es. Via Gaudenzio Ferrari 5, Milano"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls="address-results"
        aria-autocomplete="list"
      />
      <p className="mt-1 text-xs muted">
        {loading ? "Ricerca…" : "Scrivi almeno 3 caratteri. I dati vengono da OpenStreetMap."}
      </p>

      {open && results.length > 0 && (
        <ul
          id="address-results"
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full origin-top animate-scale-in overflow-y-auto rounded-xl border shadow-float"
          style={{ background: "rgb(var(--card))", borderColor: "rgb(var(--border))" }}
        >
          {results.map((r, i) => (
            <li key={`${r.latitude}-${r.longitude}-${i}`} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm ${
                  i === highlight ? "bg-brand-50 dark:bg-white/10" : "hover:bg-brand-50 dark:hover:bg-white/5"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
