"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Music, Video, ImageIcon, Plus, X } from "lucide-react";
import { FileUpload, type UploadedFile } from "@/components/FileUpload";
import { EmptyState } from "@/components/EmptyState";

type Item = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  mediaUrl: string;
  mediaType: string;
  year: number | null;
};

/** Le tre parole che il database salva, dette come le direbbe una persona. */
const TIPO: Record<string, { label: string; Icona: typeof Music }> = {
  image: { label: "Foto", Icona: ImageIcon },
  video: { label: "Video", Icona: Video },
  audio: { label: "Audio", Icona: Music },
};

/**
 * Il portfolio, che è fatto di immagini e suoni e veniva mostrato come testo.
 *
 * Tre problemi, in ordine di gravità.
 *
 * **«Elimina» cancellava al primo clic.** Il progetto ha già una regola per
 * questo — `DeleteEventButton` chiede conferma prima di distruggere qualcosa —
 * e qui non era applicata. Un lavoro caricato mesi prima spariva per un dito
 * scivolato, senza modo di tornare indietro: il file sul blob storage non si
 * recupera.
 *
 * **L'elenco non mostrava i lavori.** Titolo, la stringa grezza «image» e
 * l'anno. Di un portfolio — l'unica sezione del sito che esiste per far
 * vedere qualcosa — non si vedeva niente, e riconoscere quale dei cinque
 * caricamenti fosse quale richiedeva di aprirli uno a uno.
 *
 * **Il modulo veniva prima dei lavori.** Chi ne ha già cinque scorre ogni
 * volta un modulo di caricamento per arrivare a quello che ha. Ma chi non ne
 * ha nessuno deve trovarcelo davanti: da qui il modulo che si apre da un
 * pulsante e resta aperto quando la griglia è vuota.
 */
export function PortfolioManager({ initialItems }: { initialItems: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState("");
  const [upload, setUpload] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aperto, setAperto] = useState(initialItems.length === 0);
  const [daEliminare, setDaEliminare] = useState<string | null>(null);
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
      setAperto(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
      setDaEliminare(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {items.length === 0 ? (
        <EmptyState
          title="Il portfolio è vuoto"
          body="Un profilo senza lavori non compare nei motori di ricerca e convince poco chi lo apre: bastano tre pezzi per cambiare le cose."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const t = TIPO[item.mediaType] ?? TIPO.image;
            const inCancellazione = daEliminare === item.id;

            return (
              <li
                key={item.id}
                className={`card-glow group overflow-hidden p-0 ${
                  inCancellazione ? "border-red-400/50" : ""
                }`}
              >
                {/* Anteprima solo per le immagini: video e audio richiedono un
                    player, che in una griglia di gestione è peso senza scopo —
                    qui si riconosce un lavoro, non lo si guarda. Al loro posto
                    l'icona del tipo, che basta a distinguerli. */}
                <Link
                  href={`/portfolio/${item.slug}`}
                  className="relative block aspect-[16/10] overflow-hidden bg-surface-sunken"
                >
                  {item.mediaType === "image" ? (
                    <Image
                      src={item.mediaUrl}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover transition-transform duration-400 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center">
                      <t.Icona className="h-8 w-8 text-ink-faint" aria-hidden="true" />
                    </span>
                  )}

                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-surface/85 px-2.5 py-1 text-fluid-xs font-semibold backdrop-blur">
                    <t.Icona className="h-3 w-3" aria-hidden="true" />
                    {t.label}
                  </span>
                </Link>

                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <Link
                      href={`/portfolio/${item.slug}`}
                      className="block truncate text-fluid-sm font-semibold transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                    >
                      {item.title}
                    </Link>
                    {item.year && (
                      <p className="mt-0.5 text-fluid-xs tabular-nums text-ink-faint">{item.year}</p>
                    )}
                  </div>

                  {/* Conferma in due tempi, come per gli ingaggi: il file
                      caricato non si recupera, e un clic sbagliato costa un
                      lavoro. */}
                  {inCancellazione ? (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="btn-ghost text-fluid-xs text-red-500"
                        disabled={pending}
                        onClick={() => remove(item.id)}
                      >
                        {pending ? "…" : "Conferma"}
                      </button>
                      <button
                        type="button"
                        className="btn-ghost text-fluid-xs"
                        onClick={() => setDaEliminare(null)}
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-ghost shrink-0 px-2 text-ink-faint hover:text-red-500"
                      aria-label={`Elimina ${item.title}`}
                      onClick={() => setDaEliminare(item.id)}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!aperto ? (
        <button type="button" className="btn-primary" onClick={() => setAperto(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Aggiungi un lavoro
        </button>
      ) : (
        <form onSubmit={create} className="card space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-fluid-lg font-bold">Aggiungi un lavoro</h2>
              <p className="mt-1 text-fluid-sm text-ink-muted">
                Il titolo è quello con cui ti si troverà: «Cover jazz al Bravo
                Caffè» dice più di «Live 3».
              </p>
            </div>
            {items.length > 0 && (
              <button
                type="button"
                className="btn-ghost shrink-0 px-2"
                aria-label="Chiudi"
                onClick={() => setAperto(false)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div>
            <label htmlFor="p-title" className="mb-1 block text-fluid-sm font-medium">
              Titolo
            </label>
            <input
              id="p-title"
              className="input"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="p-desc" className="mb-1 block text-fluid-sm font-medium">
              Descrizione <span className="text-ink-faint">(facoltativa)</span>
            </label>
            <textarea
              id="p-desc"
              className="input min-h-20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="p-year" className="mb-1 block text-fluid-sm font-medium">
              Anno <span className="text-ink-faint">(facoltativo)</span>
            </label>
            <input
              id="p-year"
              type="number"
              min={1950}
              max={2100}
              className="input"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>

          <FileUpload folder="portfolio" label="Carica foto, video o audio" onUploaded={setUpload} />
          {upload && (
            <p className="text-fluid-sm text-ink-muted">
              Pronto: {upload.url.split("/").pop()} ({Math.round(upload.bytes / 1024)} kB)
            </p>
          )}

          {error && (
            <p role="alert" className="text-fluid-sm text-red-500">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={pending || !title || !upload}>
            {pending ? "Salvataggio…" : "Aggiungi al portfolio"}
          </button>
        </form>
      )}
    </div>
  );
}
