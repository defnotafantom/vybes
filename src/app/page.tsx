import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";
import { JsonLd } from "@/components/JsonLd";
import { faqJsonLd } from "@/lib/jsonld";
import { ScenaLanding } from "@/components/ScenaLanding";

/**
 * La landing.
 *
 * ── Cosa c'era, e perché non c'è più ──
 *
 * Nove sezioni: vetrina degli artisti, prossimi ingaggi, nastro delle città,
 * discipline, riquadri, FAQ, con sopra una barra di navigazione a cinque voci.
 * Materiale utile — a chi ha già deciso. A chi arriva per la prima volta
 * chiedeva di leggere una rivista per capire una cosa che si dice in una riga,
 * e gli offriva cinque modi per andarsene prima di averla capita.
 *
 * Adesso la prima schermata fa una cosa sola: dire cos'è questo posto, e
 * chiedere di entrare. Il resto del sito non è sparito — esiste, è indicizzato,
 * e il piè di pagina ci porta.
 *
 * ── Il conto con la SEO, dichiarato ──
 *
 * Questa pagina portava testo indicizzabile e i collegamenti interni verso un
 * centinaio di pagine città/disciplina. Toglierli tutti sarebbe stato un
 * declassamento lento e invisibile: le pagine restano nella sitemap, ma una
 * pagina che nessuno collega vale meno, e non arriva nessun errore a dirlo.
 *
 * Quindi restano due cose. Il **piè di pagina**, che porta i collegamenti
 * interni e si incontra solo dopo aver scorso tutta la scena. E le **FAQ come
 * dati strutturati**: non sono più visibili, ma continuano a stare nell'HTML
 * in `JsonLd`, che è la forma in cui Google le usa per i risultati arricchiti.
 * Il testo delle quattro battute della scena è nel documento fin dall'inizio —
 * non compare scorrendo, cambia solo opacità — quindi è indicizzabile com'era.
 *
 * ── E la velocità ──
 *
 * La pagina non interroga più il database. Prima ne faceva quattro query per
 * comporre vetrina, ingaggi e conteggi; adesso è statica, e l'`export const
 * revalidate` non serve più perché non c'è niente da rivalidare.
 */

export const metadata: Metadata = buildMetadata({
  title: `${SITE.name} — ${SITE.tagline}`,
  description:
    "Artisti e chi li ingaggia si trovano qui, senza intermediari. Musicisti, DJ, band, ballerini e performer da una parte; locali, festival e agenzie dall'altra.",
  path: "/",
  keywords: [
    "trovare artisti",
    "ingaggiare musicisti",
    "casting artisti Italia",
    "musica dal vivo locali",
    "piattaforma artisti",
  ],
});

/**
 * Le FAQ non si vedono più, ma continuano a valere.
 *
 * Erano una sezione a fondo pagina. Come sezione erano rumore — nessuno arriva
 * su una landing per leggere domande frequenti — ma come dati strutturati sono
 * la cosa che fa comparire le risposte direttamente nei risultati di Google.
 * Tolta la vista, resta il marcatore: è l'unico posto del progetto in cui una
 * cosa invisibile è comunque quella giusta da tenere.
 */
const FAQ = [
  {
    q: "Quanto costa usare Vybes?",
    a: "Creare il profilo, pubblicare il portfolio e candidarsi agli ingaggi è gratuito per gli artisti. Gli organizzatori pubblicano annunci senza commissioni sul cachet.",
  },
  {
    q: "Come faccio a trovare artisti nella mia città?",
    a: "Usa la directory locale: ogni città ha una pagina dedicata con i profili attivi in zona, filtrabili per disciplina, e la mappa degli ingaggi aperti nel raggio scelto.",
  },
  {
    q: "Chi può pubblicare un ingaggio?",
    a: "Locali, agenzie, festival e organizzatori registrati come recruiter. Ogni annuncio indica data, luogo, compenso e numero di posti.",
  },
  {
    q: "I profili sono verificati?",
    a: "Ogni account richiede la verifica dell'email. I profili con portfolio completo e ingaggi conclusi ottengono il badge verificato.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqJsonLd(FAQ)} />
      <ScenaLanding />
    </>
  );
}
