"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FileUpload, type UploadedFile } from "@/components/FileUpload";

type Item = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  mediaUrl: string;
  mediaType: string;
  year: number | null;
};

export function PortfolioManager({ initialItems }: { initialItems: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState("");
  const [upload, setUpload] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create(e: React.FormEvent) {
    e.preventDefault();
    if (!upload) {
      setError("Carica prima un file");
      return;
    }
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          mediaUrl: upload.url,
          mediaType: upload.kind,
          year: year ? Number(year) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Creazione non riuscita");
        return;
      }
      setItems((prev) => [...prev, json.data]);
      setTitle("");
      setDescription("");
      setYear("");
      setUpload(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="card space-y-4">
        <h2 className="font-semibold">Aggiungi un lavoro</h2>

        <div>
          <label htmlFor="p-title" className="mb-1 block text-sm font-medium">Titolo</label>
          <input id="p-title" className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label htmlFor="p-desc" className="mb-1 block text-sm font-medium">Descrizione</label>
          <textarea id="p-desc" className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <label htmlFor="p-year" className="mb-1 block text-sm font-medium">Anno</label>
          <input id="p-year" type="number" min={1950} max={2100} className="input" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>

        <FileUpload folder="portfolio" label="Carica foto, video o audio" onUploaded={setUpload} />
        {upload && <p className="text-sm muted">Pronto: {upload.url.split("/").pop()} ({Math.round(upload.bytes / 1024)} kB)</p>}

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <button type="submit" className="btn-primary" disabled={pending || !title || !upload}>
          {pending ? "Salvataggio…" : "Aggiungi al portfolio"}
        </button>
      </form>

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="card flex flex-wrap items-center justify-between gap-4">
              <div>
                <Link href={`/portfolio/${item.slug}`} className="font-medium hover:text-brand-600">
                  {item.title}
                </Link>
                <p className="text-sm muted">
                  {item.mediaType}
                  {item.year ? ` · ${item.year}` : ""}
                </p>
              </div>
              <button type="button" className="btn-ghost text-red-600" disabled={pending} onClick={() => remove(item.id)}>
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
