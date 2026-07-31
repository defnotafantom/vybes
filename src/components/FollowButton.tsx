"use client";

import { useEffect, useState, useTransition } from "react";

type State = { authenticated: boolean; isSelf: boolean; following: boolean } | null;

/**
 * Lo stato viene caricato dal client: la pagina profilo resta statica e
 * servita dalla CDN a tutti allo stesso modo.
 */
export function FollowButton({ slug, initialCount }: { slug: string; initialCount: number }) {
  const [state, setState] = useState<State>(null);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    fetch(`/api/follow/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j) setState(j.data);
      })
      .catch(() => setState({ authenticated: false, isSelf: false, following: false }));
    return () => {
      alive = false;
    };
  }, [slug]);

  // Finché non si sa, si mostra un segnaposto della stessa altezza: niente
  // salto di layout quando arriva la risposta.
  if (!state) return <span className="btn-ghost pointer-events-none opacity-50">Segui</span>;
  if (state.isSelf) return null;

  if (!state.authenticated) {
    return (
      <a href={`/accedi?next=/artisti/${slug}`} className="btn-ghost">
        Segui
      </a>
    );
  }

  function toggle() {
    startTransition(async () => {
      const previous = state!.following;
      setState({ ...state!, following: !previous });
      setCount((c) => c + (previous ? -1 : 1));

      const res = await fetch(`/api/follow/${slug}`, { method: "POST" });
      if (!res.ok) {
        setState({ ...state!, following: previous });
        setCount((c) => c + (previous ? 1 : -1));
        return;
      }
      const json = await res.json();
      setState((s) => (s ? { ...s, following: json.data.following } : s));
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={state.following}
      className={state.following ? "btn-ghost" : "btn-primary"}
    >
      {state.following ? "Segui già" : "Segui"}
      <span className="ml-1 opacity-70">{count}</span>
    </button>
  );
}
