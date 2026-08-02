"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { NewPostForm } from "@/components/NewPostForm";
import { CommentThread } from "@/components/CommentThread";
import { Heart, Bookmark, AlertCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/Badge";
import { RichText } from "@/components/RichText";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

type Post = {
  id: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  type: string;
  createdAt: string;
  author: { slug: string; name: string; image: string | null; level: number; isVerified: boolean };
  tags: { tag: { slug: string; label: string } }[];
  _count: { likes: number; comments: number };
  likedByMe: boolean;
  savedByMe: boolean;
};

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (next?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts${next ? `?cursor=${next}` : ""}`);
      if (!res.ok) throw new Error("Caricamento non riuscito");
      const json = await res.json();
      setPosts((prev) => (next ? [...prev, ...json.data.posts] : json.data.posts));
      setCursor(json.data.nextCursor);
      setHasMore(Boolean(json.data.nextCursor));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleSave(id: string) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, savedByMe: !p.savedByMe } : p)));
    const res = await fetch(`/api/posts/${id}/salva`, { method: "POST" });
    if (!res.ok) load();
  }

  function setCommentCount(id: string, n: number) {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, _count: { ...p._count, comments: n } } : p))
    );
  }

  async function toggleLike(id: string) {
    // Aggiornamento ottimistico, con rollback in caso di errore.
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, likedByMe: !p.likedByMe, _count: { ...p._count, likes: p._count.likes + (p.likedByMe ? -1 : 1) } }
          : p
      )
    );
    const res = await fetch(`/api/posts/${id}/like`, { method: "POST" });
    if (!res.ok) load();
  }

  return (
    <div className="space-y-6">
      <NewPostForm onCreated={() => load()} />

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
            <button type="button" className="underline" onClick={() => load()}>Riprova</button>
          </span>
        </p>
      )}

      {posts.map((post) => (
        <article key={post.id} className="card">
          <header className="flex items-center gap-3">
<Avatar name={post.author.name} src={post.author.image} size="sm" />
            <div>
              <span className="flex items-center gap-1">
                <Link href={`/artisti/${post.author.slug}`} className="font-medium hover:text-brand-600">
                  {post.author.name}
                </Link>
                {post.author.isVerified && <VerifiedBadge />}
              </span>
              <p className="text-xs muted">
                Lv. {post.author.level} ·{" "}
                <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString("it-IT")}</time>
              </p>
            </div>
          </header>

          <p className="mt-4 whitespace-pre-line leading-relaxed">
            <RichText text={post.content} />
          </p>

          {post.mediaUrl && post.mediaType === "image" && (
            <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-xl bg-brand-50 dark:bg-white/5">
              <OptimizedImage
                src={post.mediaUrl}
                alt={`Immagine allegata al post di ${post.author.name}`}
                fill
                sizes="(max-width: 768px) 100vw, 640px"
                className="object-cover"
              />
            </div>
          )}

          {post.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {post.tags.map(({ tag }) => (
  <li key={tag.slug} className="chip">#{tag.label}</li>
              ))}
            </ul>
          )}

          <footer className="mt-4 flex flex-wrap items-start gap-4 text-sm">
            <button
              type="button"
              onClick={() => toggleLike(post.id)}
              aria-pressed={post.likedByMe}
              aria-label={post.likedByMe ? "Togli il mi piace" : "Metti mi piace"}
              className={`inline-flex items-center gap-1.5 transition-colors ${post.likedByMe ? "font-medium text-brand-600" : "muted hover:text-ink"}`}
            >
              <Heart
                className={`h-4 w-4 ${post.likedByMe ? "fill-current" : ""}`}
                aria-hidden="true"
              />
              {post._count.likes}
            </button>

            <button
              type="button"
              onClick={() => toggleSave(post.id)}
              aria-pressed={post.savedByMe}
              className={`inline-flex items-center gap-1.5 transition-colors ${post.savedByMe ? "font-medium text-brand-600" : "muted hover:text-ink"}`}
            >
              <Bookmark
                className={`h-4 w-4 ${post.savedByMe ? "fill-current" : ""}`}
                aria-hidden="true"
              />
              {post.savedByMe ? "Salvato" : "Salva"}
            </button>

            <CommentThread
              postId={post.id}
              count={post._count.comments}
              onCountChange={(n) => setCommentCount(post.id, n)}
            />
          </footer>
        </article>
      ))}

      {/* Il feed vuoto non diceva niente: dopo il riquadro per scrivere,
          il nulla. Su una piattaforma appena aperta è lo stato che vedono
          tutti, ed è la prima impressione del prodotto una volta entrati.
          Uno schermo bianco si legge come «qui non c'è niente da fare»,
          quando invece le cose da fare sono altrove. */}
      {!loading && posts.length === 0 && !error && (
        <div className="card text-center">
          <p className="text-fluid-base font-semibold">Ancora nessun post</p>
          <p className="mx-auto mt-2 max-w-md text-fluid-sm text-ink-muted">
            Il feed si riempie con quello che pubblicano gli artisti che segui.
            Nel frattempo la parte utile del sito è di là: gli ingaggi aperti e
            i profili da seguire.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/eventi" className="btn-primary">
              Vedi gli ingaggi aperti
            </Link>
            <Link href="/artisti" className="btn-ghost">
              Trova artisti da seguire
            </Link>
          </div>
        </div>
      )}

      {hasMore && (
        <button type="button" className="btn-ghost w-full" disabled={loading} onClick={() => load(cursor)}>
          {loading ? "Caricamento…" : "Carica altri post"}
        </button>
      )}

      {!hasMore && posts.length > 0 && <p className="text-center text-sm muted">Hai visto tutto.</p>}
    </div>
  );
}
