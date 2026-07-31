"use client";

import { useRef, useState, useTransition } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ArtistPicker, type PickedArtist } from "@/components/ArtistPicker";

const SUGGESTED_TAGS = ["live", "studio", "collaborazione", "nuovo-brano", "cerco-band", "backstage"];

export function NewPostForm({ onCreated }: { onCreated: () => void }) {
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [media, setMedia] = useState<{ url: string; kind: string } | null>(null);
  const [collaborators, setCollaborators] = useState<PickedArtist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          tags,
          mediaUrl: media?.url ?? "",
          mediaType: media?.kind,
          // Un post con collaboratori è di tipo COLLABORATION: sblocca la
          // quest e fa partire gli inviti.
          type: collaborators.length > 0 ? "COLLABORATION" : "STANDARD",
          collaborationArtists: collaborators.map((c) => c.id),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Pubblicazione non riuscita");
        return;
      }

      setContent("");
      setTags([]);
      setMedia(null);
      setCollaborators([]);
      onCreated();
      textareaRef.current?.focus();
    });
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <label htmlFor="post-content" className="block text-sm font-medium">
        Condividi qualcosa
      </label>
      <textarea
        id="post-content"
        ref={textareaRef}
        className="input min-h-24"
        maxLength={3000}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Un nuovo brano, una data appena confermata, un cercasi batterista…"
      />

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Tag</legend>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TAGS.map((t) => {
            const active = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                className={active ? "btn-primary px-3 py-1 text-xs" : "btn-ghost px-3 py-1 text-xs"}
                onClick={() =>
                  setTags((prev) => (active ? prev.filter((x) => x !== t) : prev.length < 6 ? [...prev, t] : prev))
                }
              >
                #{t}
              </button>
            );
          })}
        </div>
      </fieldset>

      <ArtistPicker selected={collaborators} onChange={setCollaborators} />

      <FileUpload folder="post" onUploaded={(r) => setMedia({ url: r.url, kind: r.kind })} />
      {media && <p className="text-sm muted">Allegato pronto: {media.url.split("/").pop()}</p>}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <button type="submit" className="btn-primary" disabled={pending || !content.trim()}>
        {pending ? "Pubblicazione…" : "Pubblica"}
      </button>
    </form>
  );
}
