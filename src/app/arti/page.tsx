import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DISCIPLINES } from "@/lib/constants";
import { SCHEDE } from "@/lib/arti";

/**
 * L'indice dell'atlante.
 *
 * Esiste per due ragioni, e nessuna delle due è «serviva una pagina indice».
 *
 * La prima è che le pagine delle singole arti hanno bisogno di **un posto da
 * cui essere collegate**: nella sitemap ci sono, ma una pagina che nessuno
 * collega riceve meno autorità e il calo non produce nessun errore.
 *
 * La seconda è che l'elenco stesso è divulgazione: qualcuno scoprirà qui che
 * esiste una parola per una cosa che aveva visto senza saperla nominare. È il
 * motivo per cui non è un menu a tendina.
 */

export const metadata: Metadata = buildMetadata({
  title: "Le arti",
  description:
    "Cos'è davvero ogni arte, oltre l'idea che se ne ha: le forme in cui esiste, dove la si incontra, e chi la pratica in Italia.",
  path: "/arti",
});

export default function ArtiPage() {
  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ name: "Arti", path: "/arti" }]} />

      <header className="max-w-2xl">
        <h1 className="text-fluid-2xl font-bold">Le arti</h1>
        <p className="mt-3 text-fluid-lg text-ink-muted">
          Di ognuna si ha un&apos;idea, e quasi sempre è più stretta della cosa. Qui
          c&apos;è cosa sono davvero, in quante forme esistono, e chi le pratica adesso.
        </p>
      </header>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DISCIPLINES.map((d) => (
          <li key={d.slug}>
            <Link
              href={`/arti/${d.slug}`}
              className="block h-full rounded-2xl border p-5 transition-colors hover:border-border-strong"
            >
              <h2 className="font-semibold">{d.plural}</h2>
              {/* Si dichiara quali sono scritte: un elenco in cui alcune voci
                  portano a una scheda e altre a un guscio, senza dirlo, fa
                  sembrare rotto il sito invece che in costruzione. */}
              <p className="mt-1.5 text-fluid-sm muted">
                {SCHEDE[d.slug]?.stato === "rivista"
                  ? "Scheda rivista"
                  : SCHEDE[d.slug]
                    ? "Bozza, da rileggere"
                    : "Scheda da scrivere"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
