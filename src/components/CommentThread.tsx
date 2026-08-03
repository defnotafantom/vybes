"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { RichText } from "@/components/RichText";
import { quandoRelativo } from "@/lib/date";
import { conta } from "@/lib/testo";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: { slug: string; name: string; image: string | null };
};

/**
 * I commenti si caricano alla prima apertura, non con il feed: su una
 * timeline di quindici post significa quindici query in meno per pagina.
 */
export function CommentThread({
  postId,
  count,
  onCountChange,
}: {
  postId: string;
  count: number;
  onCountChange: (n: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || comments) return;
    fetch(`/api/posts/${postId}/commenti`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setComments(j?.data ?? []))
      .catch(() => setError("Non è stato possibile caricare i commenti"));
  }, [open, comments, postId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setError(null);

    startTransition(async () => {
      const res = await fetch(`/api/posts/${postId}/commenti`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Commento non inviato");
        return;
      }
      const json = await res.json();
      setComments((prev) => [...(prev ?? []), json.data]);
      onCountChange(count + 1);
      setDraft("");
    });
  }

  return (
    <div className="w-full">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 muted transition-colors hover:text-brand-600"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {conta(count, "commento", "commenti")}
      </button>

      {open && (
        <div className="mt-4 space-y-4 border-t pt-4" style={{ borderColor: "rgb(var(--border))" }}>
          {comments === null && <p className="text-sm muted">Caricamento…</p>}

          {comments?.length === 0 && <p className="text-sm muted">Ancora nessun commento.</p>}

          {comments?.map((c) => (
            <article key={c.id} className="flex gap-3">
<Avatar name={c.author.name} src={c.author.image} size="xs" />
              <div className="min-w-0">
                <p className="text-sm">
                  <Link href={`/artisti/${c.author.slug}`} className="font-medium hover:text-brand-600">
                    {c.author.name}
                  </Link>{" "}
                  <time dateTime={c.createdAt} className="text-xs muted">
                    {quandoRelativo(c.createdAt)}
                  </time>
                </p>
                <p className="whitespace-pre-line text-sm">
                  <RichText text={c.content} />
                </p>
              </div>
            </article>
          ))}

          <form onSubmit={submit} className="flex gap-2">
            <label htmlFor={`comment-${postId}`} className="sr-only">Scrivi un commento</label>
            <input
              id={`comment-${postId}`}
              className="input"
              maxLength={1000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Scrivi un commento…"
            />
            <button type="submit" className="btn-primary" disabled={pending || !draft.trim()}>
              Invia
            </button>
          </form>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
