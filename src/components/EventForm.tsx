"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EVENT_CATEGORIES } from "@/lib/constants";
import { eventSchema, eventNuovoSchema, MIN_DESCRIZIONE_INGAGGIO } from "@/lib/validations";
import { FileUpload } from "@/components/FileUpload";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Errore, ErroriOrfani } from "@/components/ui/Errore";

type City = { slug: string; name: string; latitude: number; longitude: number };

/** I campi che hanno un posto in pagina dove mostrare il proprio errore. */
const CAMPI_CON_ERRORE = [
  "title", "category", "description", "startsAt", "endsAt", "citySlug",
  "latitude", "longitude", "venueName", "address", "feeMin", "feeMax",
  "capacity", "coverImage",
] as const;

/**
 * «Adesso» nel formato che `datetime-local` accetta, per l'attributo `min`.
 *
 * Serve il fuso locale, non UTC: `toISOString()` darebbe l'ora di Greenwich e
 * d'estate in Italia bloccherebbe le due ore successive — un organizzatore
 * che alle 21 pubblica per le 22 si vedrebbe rifiutare una data futura.
 *
 * È solo un aiuto del browser, non la difesa: quella è `eventNuovoSchema`,
 * che vale anche per chi manda la richiesta senza passare da qui.
 */
function adessoLocale(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

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
  // Solo per il contatore: il valore vero lo legge `FormData` al submit, come
  // per tutti gli altri campi non controllati di questo modulo.
  const [descrizione, setDescrizione] = useState(initial?.description ?? "");
  const mancanti = MIN_DESCRIZIONE_INGAGGIO - descrizione.trim().length;

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

    // Alla modifica non si pretende una data futura: correggere un refuso nel
    // titolo di una serata dell'anno scorso deve restare possibile. Vedi la
    // nota su `eventNuovoSchema`.
    const parsed = (isEdit ? eventSchema : eventNuovoSchema).safeParse(payload);
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
        <Errore msg={errors.title} />
      </div>

      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium">Categoria</label>
        <select id="category" name="category" className="input" defaultValue={initial?.category ?? "LIVE"}>
          {Object.entries(EVENT_CATEGORIES).map(([key, v]) => (
            <option key={key} value={key}>{v.label}</option>
          ))}
        </select>
        <Errore msg={errors.category} />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">Descrizione</label>
        <textarea
          id="description"
          name="description"
          className="input min-h-32"
          required
          aria-describedby="desc-help"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
        />
        {/* Il minimo era dichiarato e non contato, come per la biografia: si
            scopriva di non averlo raggiunto solo premendo «Pubblica». */}
        <p id="desc-help" aria-live="polite" className="mt-1 text-xs muted">
          {mancanti > 0
            ? `Ancora ${mancanti} caratteri: sotto i ${MIN_DESCRIZIONE_INGAGGIO} l'annuncio non si pubblica. Questo testo diventa la descrizione nei risultati di ricerca.`
            : "Questo testo diventa la descrizione nei risultati di ricerca: le prime due righe sono quelle che si leggono su Google."}
        </p>
        <Errore msg={errors.description} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startsAt" className="mb-1 block text-sm font-medium">Inizio</label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            className="input"
            required
            // Alla creazione il selettore del browser sbarra già le date
            // passate. Alla modifica no: l'annuncio potrebbe legittimamente
            // averne una, e `min` renderebbe il campo irreparabile.
            min={isEdit ? undefined : adessoLocale()}
            defaultValue={initial?.startsAt}
          />
          <Errore msg={errors.startsAt} />
        </div>
        <div>
          <label htmlFor="endsAt" className="mb-1 block text-sm font-medium">Fine <span className="muted">(facoltativa)</span></label>
          <input id="endsAt" name="endsAt" type="datetime-local" className="input" defaultValue={initial?.endsAt} />
          <Errore msg={errors.endsAt} />
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
        <Errore msg={errors.citySlug} />
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
            <Errore msg={errors.latitude} />
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
            <Errore msg={errors.longitude} />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="venueName" className="mb-1 block text-sm font-medium">Locale</label>
          <input id="venueName" name="venueName" className="input" defaultValue={initial?.venueName} />
          <Errore msg={errors.venueName} />
        </div>
        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium">Indirizzo</label>
          <input id="address" name="address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Errore msg={errors.address} />
        </div>
      </div>

      <fieldset className="space-y-3">
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            className="checkbox"
            checked={isPaid}
            onChange={(e) => setIsPaid(e.target.checked)}
          />
          Ingaggio retribuito
        </label>
        {isPaid && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="feeMin" className="mb-1 block text-xs muted">Compenso minimo (€)</label>
              <input id="feeMin" name="feeMin" type="number" min={0} className="input" defaultValue={initial?.feeMin ?? ""} />
              <Errore msg={errors.feeMin} />
            </div>
            <div>
              <label htmlFor="feeMax" className="mb-1 block text-xs muted">Compenso massimo (€)</label>
              <input id="feeMax" name="feeMax" type="number" min={0} className="input" defaultValue={initial?.feeMax ?? ""} />
              <Errore msg={errors.feeMax} />
            </div>
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor="capacity" className="mb-1 block text-sm font-medium">Posti disponibili</label>
        <input id="capacity" name="capacity" type="number" min={1} className="input" defaultValue={initial?.capacity ?? ""} />
        {/* Il campo si chiamava «Posti disponibili» e basta, che su un
            annuncio di lavoro si legge come «quanti spettatori entrano».
            Sono gli artisti che si cercano. */}
        <p className="mt-1 text-xs muted">
          Quanti artisti cerchi. Lascialo vuoto se non hai un numero fisso.
        </p>
        <Errore msg={errors.capacity} />
      </div>

      <FileUpload folder="evento" accept="image/*" label="Carica immagine di copertina" onUploaded={(f) => setCover(f.url)} />
      {cover && <p className="text-sm muted">Copertina pronta.</p>}
      <Errore msg={errors.coverImage} />

      <ErroriOrfani errori={errors} mostrati={CAMPI_CON_ERRORE} />

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
