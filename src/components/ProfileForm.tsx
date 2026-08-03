"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DISCIPLINES } from "@/lib/constants";
import { profileSchema } from "@/lib/validations";
import { FileUpload } from "@/components/FileUpload";
import { SCAGLIONI_BIO } from "@/lib/reputazione";

/**
 * Il messaggio d'errore di un campo.
 *
 * Esiste per una ragione precisa. Gli errori venivano raccolti in un
 * dizionario indicizzato per campo — `zod` ne produce uno per ogni regola
 * violata — ma solo quattro campi su undici lo mostravano. Un modulo che
 * rifiuta di salvare e non dice niente è peggio di uno che salva male: chi lo
 * usa ripreme «Salva» e conclude che il sito è rotto.
 *
 * Il difetto non è di quei sette campi: è che mostrare l'errore era una cosa
 * da ricordarsi. Qui è un componente solo, e più sotto ogni chiave rimasta
 * fuori viene stampata comunque — così una regola nuova in `profileSchema`
 * non può più diventare un rifiuto silenzioso.
 */
function Errore({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
      {msg}
    </p>
  );
}

/** I campi che hanno un posto in pagina dove mostrare il proprio errore. */
const CAMPI_CON_ERRORE = [
  "name", "headline", "bio", "disciplines", "citySlug",
  "website", "instagram", "spotify", "youtube", "image",
];

type Initial = {
  name: string;
  image: string | null;
  headline: string | null;
  bio: string | null;
  disciplines: string[];
  citySlug: string | null;
  website: string | null;
  instagram: string | null;
  spotify: string | null;
  youtube: string | null;
  isPublic: boolean;
};

export function ProfileForm({
  initial,
  cities,
}: {
  initial: Initial;
  cities: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [image, setImage] = useState(initial.image ?? "");
  const [form, setForm] = useState({
    name: initial.name,
    headline: initial.headline ?? "",
    bio: initial.bio ?? "",
    citySlug: initial.citySlug ?? "",
    website: initial.website ?? "",
    instagram: initial.instagram ?? "",
    spotify: initial.spotify ?? "",
    youtube: initial.youtube ?? "",
    isPublic: initial.isPublic,
  });
  const [disciplines, setDisciplines] = useState<string[]>(initial.disciplines);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = (k: keyof typeof form, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  /**
   * Quanto manca al prossimo scaglione della biografia.
   *
   * La scheda della reputazione, dieci centimetri più in alto, chiede
   * «quattrocento caratteri»; il campo non ne mostrava nessuno. L'headline,
   * che ha una sola soglia e meno peso, il contatore ce l'aveva.
   *
   * Deliberatamente non si parla qui della soglia di indicizzazione, che pure
   * riguarda la biografia: quella regola è «almeno 120 caratteri **oppure**
   * un lavoro nel portfolio», e questo modulo non sa quanti lavori ci siano.
   * Dirla a metà significherebbe scrivere «non compari su Google» a qualcuno
   * che invece ci compare. Quella frase la dice la dashboard, che ha il dato.
   */
  const bioLen = form.bio.trim().length;
  const bioMax = SCAGLIONI_BIO[0];
  const bioProssimo = [...SCAGLIONI_BIO].reverse().find((s) => bioLen < s.da);

  /**
   * Gli errori che nessun campo ha mostrato.
   *
   * `_` è quello generico dell'API, ma qui finisce anche qualunque chiave che
   * il server dovesse restituire per un campo non previsto. È la rete sotto
   * il trapezio: senza, quell'errore sparirebbe e basta.
   */
  const erroriOrfani = Object.entries(errors).filter(([k]) => !CAMPI_CON_ERRORE.includes(k));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);

    const parsed = profileSchema.safeParse({ ...form, disciplines, image });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.errors) next[issue.path.join(".")] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});

    startTransition(async () => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setErrors(json.details ?? { _: json.error ?? "Salvataggio non riuscito" });
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">Nome pubblico</label>
        <input id="name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
        <Errore msg={errors.name} />
      </div>

      <div>
        <label htmlFor="headline" className="mb-1 block text-sm font-medium">
          Headline <span className="muted">(max 120 caratteri)</span>
        </label>
        <input
          id="headline"
          className="input"
          maxLength={120}
          value={form.headline}
          onChange={(e) => set("headline", e.target.value)}
          aria-describedby="headline-help"
        />
        <p id="headline-help" className="mt-1 text-xs muted">
          È la meta description del tuo profilo: {form.headline.length}/120 caratteri usati.
        </p>
        <Errore msg={errors.headline} />
      </div>

      <div>
        <label htmlFor="bio" className="mb-1 block text-sm font-medium">Bio</label>
        <textarea
          id="bio"
          className="input min-h-32"
          maxLength={2000}
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          aria-describedby="bio-help"
        />
        {/* `aria-live` perché il testo cambia mentre si scrive: senza, chi usa
            uno screen reader scriverebbe al buio proprio nel campo in cui la
            lunghezza è l'unica cosa che conta. `polite` e non `assertive` —
            non deve interrompere la dettatura a ogni carattere. */}
        <p id="bio-help" aria-live="polite" className="mt-1 text-xs muted">
          {bioLen === 0
            ? `Chi la legge sta decidendo se ingaggiarti. A ${bioMax.da} caratteri vale ${bioMax.punti} punti di reputazione.`
            : bioProssimo
              ? `${bioLen} caratteri. Ancora ${bioProssimo.da - bioLen} e la biografia vale ${bioProssimo.punti} punti su ${bioMax.punti}.`
              : `${bioLen} caratteri: la biografia vale già il massimo, ${bioMax.punti} punti.`}
        </p>
        <Errore msg={errors.bio} />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Discipline (max 5)</legend>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINES.map((d) => {
            const active = disciplines.includes(d.slug);
            return (
              <button
                key={d.slug}
                type="button"
                aria-pressed={active}
                className={active ? "btn-primary px-3 py-1 text-xs" : "btn-ghost px-3 py-1 text-xs"}
                onClick={() =>
                  setDisciplines((prev) =>
                    active ? prev.filter((x) => x !== d.slug) : prev.length < 5 ? [...prev, d.slug] : prev
                  )
                }
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <Errore msg={errors.disciplines} />
      </fieldset>

      <div>
        <label htmlFor="citySlug" className="mb-1 block text-sm font-medium">Città</label>
        <select id="citySlug" className="input" value={form.citySlug} onChange={(e) => set("citySlug", e.target.value)}>
          <option value="">Nessuna</option>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <p className="mt-1 text-xs muted">Determina in quale directory locale compari.</p>
        <Errore msg={errors.citySlug} />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Link</legend>
        {(["website", "instagram", "spotify", "youtube"] as const).map((k) => (
          <div key={k}>
            <label htmlFor={k} className="mb-1 block text-xs capitalize muted">{k}</label>
            <input
              id={k}
              type="url"
              className="input"
              placeholder="https://…"
              value={form[k]}
              onChange={(e) => set(k, e.target.value)}
            />
            <Errore msg={errors[k]} />
          </div>
        ))}
      </fieldset>

      <div>
        <p className="mb-2 text-sm font-medium">Foto profilo</p>
        <div className="flex items-center gap-4">
          {image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={image} alt="Anteprima della foto profilo" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
              {form.name.charAt(0).toUpperCase() || "?"}
            </span>
          )}
          <div>
            <FileUpload
              folder="avatar"
              accept="image/*"
              label={image ? "Cambia foto" : "Carica una foto"}
              onUploaded={(f) => setImage(f.url)}
            />
            {image && (
              <button type="button" className="mt-1 text-xs text-red-600 underline" onClick={() => setImage("")}>
                Rimuovi
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs muted">
          Salva il modulo per rendere effettiva la modifica.
        </p>
        <Errore msg={errors.image} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isPublic} onChange={(e) => set("isPublic", e.target.checked)} />
        Profilo pubblico e indicizzabile dai motori di ricerca
      </label>

      {erroriOrfani.map(([k, msg]) => (
        <Errore key={k} msg={msg} />
      ))}
      {saved && (
        <p role="status" className="text-sm text-esito-ok">
          Profilo salvato.
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Salvataggio…" : "Salva"}
      </button>
    </form>
  );
}
