import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { faqJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = buildMetadata({
  title: "Come funziona Vybes",
  description:
    "Dalla creazione del profilo alla candidatura: come funziona Vybes per artisti e per chi cerca artisti. Nessuna commissione sul cachet.",
  path: "/come-funziona",
});

const STEPS_ARTIST = [
  { t: "Crea il profilo", d: "Nome, città, discipline e una headline chiara: è quello che compare nei risultati di ricerca." },
  { t: "Carica il portfolio", d: "Foto, video e tracce audio. Ogni opera diventa una pagina pubblica indicizzabile." },
  { t: "Candidati agli ingaggi", d: "Filtra per città, categoria e compenso, poi invia la candidatura con un messaggio." },
  // La frase precedente diceva che «quest e collaborazioni aumentano livello e
  // visibilità nella directory». Metà è falsa da quando i due assi sono stati
  // separati: le quest danno XP, l'XP fa il livello, e il livello **non**
  // decide la posizione in directory — quella la decide la reputazione, che si
  // calcola da fatti verificabili. Era una pagina pubblica e indicizzata che
  // spiegava male il meccanismo principale del sito, e prometteva una
  // scorciatoia che non esiste.
  { t: "Costruisci reputazione", d: "Profilo completo, portfolio e ingaggi confermati alzano la reputazione, che decide in che ordine compari nella directory." },
];

const STEPS_RECRUITER = [
  { t: "Pubblica l'ingaggio", d: "Data, luogo, compenso e posti disponibili. L'annuncio finisce su mappa e directory locale." },
  { t: "Ricevi candidature", d: "Ogni artista allega portfolio e messaggio: valuti in un colpo d'occhio." },
  { t: "Accetta o rifiuta", d: "L'artista riceve la notifica in tempo reale e l'evento entra nel suo archivio." },
];

const FAQ = [
  { q: "Vybes trattiene una percentuale sul cachet?", a: "No. L'accordo economico è diretto tra artista e organizzatore; Vybes non intermedia il pagamento." },
  { q: "Serve la partita IVA per iscriversi?", a: "No per creare il profilo. Gli obblighi fiscali dipendono dal singolo ingaggio e restano in capo alle parti." },
  { q: "Posso usare Vybes come band?", a: "Sì: crea un profilo band, che viene marcato come MusicGroup nei dati strutturati e nei risultati di ricerca." },
];

export default function ComeFunzionaPage() {
  return (
    <div className="container-page py-10">
      <JsonLd data={faqJsonLd(FAQ)} />
      <Breadcrumbs items={[{ name: "Come funziona", path: "/come-funziona" }]} />
      <h1 className="text-3xl font-bold sm:text-4xl">Come funziona Vybes</h1>
      <p className="mt-4 max-w-2xl muted">
        Due percorsi, una sola piattaforma: chi si esibisce e chi cerca chi si esibisca.
      </p>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">Se sei un artista</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {STEPS_ARTIST.map((s, i) => (
            <li key={s.t} className="card">
              <span className="text-sm font-bold text-brand-600">Passo {i + 1}</span>
              <h3 className="mt-1 font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm muted">{s.d}</p>
            </li>
          ))}
        </ol>
        <Link href="/registrati?ruolo=artista" className="btn-primary mt-6">Crea il profilo artista</Link>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold">Se cerchi artisti</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS_RECRUITER.map((s, i) => (
            <li key={s.t} className="card">
              <span className="text-sm font-bold text-brand-600">Passo {i + 1}</span>
              <h3 className="mt-1 font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm muted">{s.d}</p>
            </li>
          ))}
        </ol>
        <Link href="/registrati?ruolo=recruiter" className="btn-primary mt-6">Pubblica un ingaggio</Link>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold">Domande frequenti</h2>
        <div className="mt-6 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="card">
              <summary className="cursor-pointer font-medium">{f.q}</summary>
              <p className="mt-3 text-sm muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
