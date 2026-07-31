"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DISCIPLINES } from "@/lib/constants";
import { profileSchema } from "@/lib/validations";
import { FileUpload } from "@/components/FileUpload";

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
        {errors.name && <p role="alert" className="mt-1 text-sm text-red-600">{errors.name}</p>}
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
      </div>

      <div>
        <label htmlFor="bio" className="mb-1 block text-sm font-medium">Bio</label>
        <textarea id="bio" className="input min-h-32" maxLength={2000} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
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
            {errors[k] && <p role="alert" className="mt-1 text-sm text-red-600">{errors[k]}</p>}
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
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isPublic} onChange={(e) => set("isPublic", e.target.checked)} />
        Profilo pubblico e indicizzabile dai motori di ricerca
      </label>

      {errors._ && <p role="alert" className="text-sm text-red-600">{errors._}</p>}
      {saved && <p role="status" className="text-sm text-green-600">Profilo salvato.</p>}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Salvataggio…" : "Salva"}
      </button>
    </form>
  );
}
