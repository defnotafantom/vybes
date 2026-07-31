"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EVENT_CATEGORIES } from "@/lib/constants";
import { eventSchema } from "@/lib/validations";
import { FileUpload } from "@/components/FileUpload";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

type City = { slug: string; name: string; latitude: number; longitude: number };

export type EventFormValues = {
  id: string;
  title: string;
  description: string;
  category: string;
  startsAt: string; // formato datetime-local
  endsAt: string;
  venueName: string;
  address: string;
  citySlug: string;
  latitude: number;
  longitude: number;
  isPaid: boolean;
  feeMin: number | null;
  feeMax: number | null;
  capacity: number | null;
  coverImage: string;
};

export function EventForm({ cities, initial }: { cities: City[]; initial?: EventFormValues }) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const [citySlug, setCitySlug] = useState(initial?.citySlug ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial ? { lat: initial.latitude, lng: initial.longitude } : null
  );
  const [isPaid, setIsPaid] = useState(initial?.isPaid ?? false);
  const [cover, setCover] = useState(initial?.coverImage ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  /**
   * Alla scelta della città si precompilano le coordinate del centro:
   * l'organizzatore può poi affinarle, ma il campo non resta mai vuoto.
   */
  function onCityChange(slug: string) {
    setCitySlug(slug);
    const city = cities.find((c) => c.slug === slug);
    if (city) setCoords({ lat: city.latitude, lng: city.longitude });
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const payload = {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      category: String(form.get("category") ?? "LIVE"),
      startsAt: String(form.get("startsAt") ?? ""),
      endsAt: form.get("endsAt") ? String(form.get("endsAt")) : null,
      venueName: String(form.get("venueName") ?? ""),
      address,
      citySlug,
      latitude: coords?.lat ?? 0,
      longitude: coords?.lng ?? 0,
      isPaid,
      feeMin: form.get("feeMin") ? Number(form.get("feeMin")) : null,
      feeMax: form.get("feeMax") ? Number(form.get("feeMax")) : null,
      capacity: form.get("capacity") ? Number(form.get("capacity")) : null,
      coverImage: cover,
    };

    const parsed = eventSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.errors) next[issue.path.join(".")] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});

    startTransition(async () => {
      const res = await fetch(isEdit ? `/api/events/${initial!.id}` : "/api/events", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          startsAt: parsed.data.startsAt.toISOString(),
          endsAt: parsed.data.endsAt ? parsed.data.endsAt.toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrors(json.details ?? { _: json.error ?? "Salvataggio non riuscito" });
        return;
      }
      router.push(`/eventi/${json.data.slug}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium">Titolo</label>
        <input id="title" name="title" className="input" required defaultValue={initial?.title} />
        {errors.title && <p role="alert" className="mt-1 text-sm text-red-600">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium">Categoria</label>
        <select id="category" name="category" className="input" defaultValue={initial?.category ?? "LIVE"}>
          {Object.entries(EVENT_CATEGORIES).map(([key, v]) => (
            <option key={key} value={key}>{v.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">Descrizione</label>
        <textarea id="description" name="description" className="input min-h-32" required aria-describedby="desc-help" defaultValue={initial?.description} />
        <p id="desc-help" className="mt-1 text-xs muted">
          Minimo 30 caratteri. Questo testo diventa la descrizione nei risultati di ricerca.
        </p>
        {errors.description && <p role="alert" className="mt-1 text-sm text-red-600">{errors.description}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startsAt" className="mb-1 block text-sm font-medium">Inizio</label>
          <input id="startsAt" name="startsAt" type="datetime-local" className="input" required defaultValue={initial?.startsAt} />
          {errors.startsAt && <p role="alert" className="mt-1 text-sm text-red-600">{errors.startsAt}</p>}
        </div>
        <div>
          <label htmlFor="endsAt" className="mb-1 block text-sm font-medium">Fine <span className="muted">(facoltativa)</span></label>
          <input id="endsAt" name="endsAt" type="datetime-local" className="input" defaultValue={initial?.endsAt} />
          {errors.endsAt && <p role="alert" className="mt-1 text-sm text-red-600">{errors.endsAt}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="citySlug" className="mb-1 block text-sm font-medium">Città</label>
        <select id="citySlug" className="input" value={citySlug} onChange={(e) => onCityChange(e.target.value)} required>
          <option value="">Seleziona…</option>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        {errors.citySlug && <p role="alert" className="mt-1 text-sm text-red-600">{errors.citySlug}</p>}
      </div>

      {/* Cercare l'indirizzo riempie coordinate e via in un colpo solo. I
          campi restano comunque modificabili a mano. */}
      <AddressAutocomplete
        defaultValue={initial?.address}
        onSelect={(r) => {
          setCoords({ lat: r.latitude, lng: r.longitude });
          setAddress(r.street || r.label.split(",").slice(0, 2).join(","));
          const match = cities.find((c) => c.name.toLowerCase() === r.city.toLowerCase());
          if (match) setCitySlug(match.slug);
        }}
      />

      {coords && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lat" className="mb-1 block text-xs muted">Latitudine</label>
            <input
              id="lat"
              type="number"
              step="0.000001"
              className="input"
              value={coords.lat}
              onChange={(e) => setCoords({ ...coords, lat: Number(e.target.value) })}
            />
          </div>
          <div>
            <label htmlFor="lng" className="mb-1 block text-xs muted">Longitudine</label>
            <input
              id="lng"
              type="number"
              step="0.000001"
              className="input"
              value={coords.lng}
              onChange={(e) => setCoords({ ...coords, lng: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="venueName" className="mb-1 block text-sm font-medium">Locale</label>
          <input id="venueName" name="venueName" className="input" defaultValue={initial?.venueName} />
        </div>
        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium">Indirizzo</label>
          <input id="address" name="address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
      </div>

      <fieldset className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
          Ingaggio retribuito
        </label>
        {isPaid && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="feeMin" className="mb-1 block text-xs muted">Compenso minimo (€)</label>
              <input id="feeMin" name="feeMin" type="number" min={0} className="input" defaultValue={initial?.feeMin ?? ""} />
              {errors.feeMin && <p role="alert" className="mt-1 text-sm text-red-600">{errors.feeMin}</p>}
            </div>
            <div>
              <label htmlFor="feeMax" className="mb-1 block text-xs muted">Compenso massimo (€)</label>
              <input id="feeMax" name="feeMax" type="number" min={0} className="input" defaultValue={initial?.feeMax ?? ""} />
            </div>
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor="capacity" className="mb-1 block text-sm font-medium">Posti disponibili</label>
        <input id="capacity" name="capacity" type="number" min={1} className="input" defaultValue={initial?.capacity ?? ""} />
      </div>

      <FileUpload folder="evento" accept="image/*" label="Carica immagine di copertina" onUploaded={(f) => setCover(f.url)} />
      {cover && <p className="text-sm muted">Copertina pronta.</p>}

      {errors._ && <p role="alert" className="text-sm text-red-600">{errors._}</p>}

      {isEdit && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800 dark:bg-white/5 dark:text-brand-300">
          L&apos;indirizzo pubblico dell&apos;ingaggio non cambia con la modifica: è la pagina già
          indicizzata dai motori di ricerca.
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Salvataggio…" : isEdit ? "Salva le modifiche" : "Pubblica ingaggio"}
      </button>
    </form>
  );
}
