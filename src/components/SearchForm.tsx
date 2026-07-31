"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Form GET: funziona anche senza JavaScript e produce URL condivisibili. */
export function SearchForm({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  return (
    <form
      role="search"
      action="/cerca"
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim().length >= 2) router.push(`/cerca?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex gap-2"
    >
      <label htmlFor="q" className="sr-only">Cerca artisti, ingaggi o portfolio</label>
      <input
        id="q"
        name="q"
        type="search"
        className="input"
        placeholder="Cerca artisti, ingaggi, città…"
        value={q}
        minLength={2}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="submit" className="btn-primary">Cerca</button>
    </form>
  );
}
