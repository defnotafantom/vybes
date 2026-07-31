"use client";

import { useEffect, useRef, useState } from "react";

export type PickedArtist = { id: string; slug: string; name: string; city: string | null };

/**
 * Selettore di artisti con ricerca in remoto e debounce.
 * Restituisce gli id, che sono quelli attesi da `collaborationArtists`.
 */
export function ArtistPicker({
  selected,
  onChange,
  max = 5,
}: {
  selected: PickedArtist[];
  onChange: (next: PickedArtist[]) => void;
  max?: number;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    // Debounce: si interroga il server solo quando l'utente smette di digitare.
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?type=artists&q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const json = await res.json();
          setResults(json.data.artists ?? []);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  function add(a: PickedArtist) {
    if (selected.some((s) => s.id === a.id) || selected.length >= max) return;
    onChange([...selected, a]);
    setQuery("");
    setResults([]);
  }

  return (
    <div>
      <label htmlFor="collab-search" className="mb-1 block text-sm font-medium">
        Invita artisti a collaborare <span className="muted">(max {max})</span>
      </label>

      {selected.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {selected.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="btn-ghost px-2 py-1 text-xs"
                onClick={() => onChange(selected.filter((s) => s.id !== a.id))}
                aria-label={`Rimuovi ${a.name}`}
              >
                {a.name} <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        id="collab-search"
        type="search"
        className="input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca per nome…"
        autoComplete="off"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls="collab-results"
      />

      {loading && <p className="mt-1 text-xs muted">Ricerca…</p>}

      {results.length > 0 && (
        <ul id="collab-results" className="mt-2 max-h-48 origin-top animate-scale-in overflow-y-auto rounded-xl border shadow-subtle">
          {results.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50 dark:hover:bg-white/5"
                onClick={() => add(a)}
              >
                <span className="font-medium">{a.name}</span>
                {a.city && <span className="muted"> · {a.city}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
