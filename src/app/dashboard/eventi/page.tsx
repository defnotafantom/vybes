import type { ReactNode } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatoCandidatura } from "@/components/ui/StatoCandidatura";
import { dataBreve } from "@/lib/date";
import { conta } from "@/lib/testo";
import { cerca } from "@/lib/ruolo";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ingaggi" };

export default async function DashboardEventiPage() {
  const session = await auth();
  const userId = session!.user.id;
  const now = new Date();

  const [me, organized, myApplications] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.event.findMany({
      where: { organizerId: userId },
      orderBy: { startsAt: "desc" },
      include: {
        _count: { select: { participations: true } },
        participations: { where: { status: "PENDING" }, select: { id: true } },
      },
    }),
    prisma.participation.findMany({
      where: { userId },
      orderBy: { event: { startsAt: "desc" } },
      include: { event: { select: { slug: true, title: true, startsAt: true, city: true, status: true } } },
    }),
  ]);

  /**
   * Gli annunci che hai pubblicato, separati dalla data.
   *
   * Erano un elenco solo, ordinato dal più recente. In produzione questo
   * significava vedere un ingaggio del **3 marzo 2024** presentato esattamente
   * come uno aperto — stessa scheda, stesso pulsante «Gestisci», stessa riga
   * «0 candidature», il cui commento nel codice diceva testualmente che serve
   * a dire «l'annuncio è vivo e nessuno ha risposto». Per una data passata
   * quella frase è falsa, e la scheda affermava una cosa che i dati
   * smentivano.
   *
   * Non è un dettaglio estetico. La directory pubblica filtra già per
   * `startsAt >= adesso`, e le proprie candidature erano già divise in attive
   * / concluse / archivio: `now` veniva calcolato in questa stessa funzione e
   * usato ovunque tranne che qui. Chi organizza dieci serate all'anno si
   * trovava le nove passate davanti alla sola che chiede attenzione.
   *
   * Gli aperti vanno dal più vicino: è l'ordine dell'urgenza. I conclusi dal
   * più recente, che è l'ordine con cui si ripesca qualcosa.
   */
  const organizzatiAperti = organized
    .filter((e) => e.startsAt >= now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const organizzatiConclusi = organized.filter((e) => e.startsAt < now);

  // Recap richiesto: in corso / futuri / conclusi / archivio.
  const upcoming = myApplications.filter((p) => p.event.startsAt >= now && p.status !== "REJECTED");
  const completed = myApplications.filter((p) => p.event.startsAt < now && p.status === "ACCEPTED");
  const archived = myApplications.filter(
    (p) => p.event.startsAt < now && p.status !== "ACCEPTED"
  );

  // Le candidature che aspettano una risposta sono l'unico numero che fa agire:
  // ogni giorno che passa un artista aspetta senza sapere.
  const daDecidere = organized.reduce((n, e) => n + e.participations.length, 0);
  const cercaArtisti = cerca(me?.role);

  /**
   * Gli annunci che hai pubblicato.
   *
   * A un artista si mostra solo se ne ha davvero: il suo stato vuoto invitava
   * a pubblicare un ingaggio, che non è quello che è venuto a fare. Chi
   * volesse comunque organizzare la propria jam trova il pulsante nella
   * pagina di chi organizza, e il ruolo non gli impedisce niente.
   */
  const organizzati =
    !cercaArtisti && organized.length === 0 ? null : (
      <>
        <section>
          <h2 className="text-fluid-lg font-bold">Ingaggi che organizzi</h2>
          {daDecidere > 0 && (
            <p className="mt-1 text-fluid-sm text-ink-muted">
              {daDecidere === 1
                ? "Una persona aspetta una risposta."
                : `${daDecidere} persone aspettano una risposta.`}{" "}
              Ogni giorno che passa aspettano senza sapere.
            </p>
          )}

          {organized.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="Non hai ancora pubblicato niente"
                body="Pubblica quello che cerchi e lascia che siano gli artisti a candidarsi: è più veloce che cercarli uno per uno."
                ctaLabel="Pubblica il primo ingaggio"
                ctaHref="/dashboard/eventi/nuovo"
              />
            </div>
          ) : organizzatiAperti.length === 0 ? (
            // Avere solo annunci passati non è come non averne mai pubblicati:
            // il primo l'hai già scritto, quindi non serve spiegare a cosa
            // serve — serve dire che in questo momento non c'è niente di
            // aperto, che è il fatto rilevante e altrimenti si dedurrebbe da
            // un elenco di date da leggere una per una.
            <p className="mt-5 text-fluid-sm text-ink-muted">
              Nessun annuncio aperto in questo momento.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {organizzatiAperti.map((e) => (
                <RigaOrganizzata key={e.id} e={e} />
              ))}
            </ul>
          )}
        </section>

        {organizzatiConclusi.length > 0 && (
          <section>
            <h2 className="text-fluid-lg font-bold">Ingaggi conclusi che hai organizzato</h2>
            <p className="mt-1 text-fluid-sm text-ink-muted">
              La data è passata. Restano qui perché le candidature ricevute sono
              la base della tua reputazione, e perché un annuncio riuscito è il
              più facile da riscrivere.
            </p>
            <ul className="mt-6 space-y-3">
              {organizzatiConclusi.map((e) => (
                <RigaOrganizzata key={e.id} e={e} concluso />
              ))}
            </ul>
          </section>
        )}
      </>
    );

  /** Le candidature che hai mandato tu. */
  const mieCandidature = (
    <>
      {/* Solo la prima mostra qualcosa quando è vuota: è l'unica in cui il
          vuoto ha un rimedio. «Nessun ingaggio concluso» non si risolve
          cliccando da nessuna parte. */}
      <EventRecap
        title="Le tue candidature attive"
        rows={upcoming}
        vuoto={
          <EmptyState
            title="Nessuna candidatura in corso"
            body="Gli ingaggi aperti si trovano nella directory pubblica: filtra per città e disciplina e candidati direttamente."
            ctaLabel="Vedi gli ingaggi aperti"
            ctaHref="/eventi"
          />
        }
      />
      {/* «Ingaggi conclusi» sarebbe stato il titolo naturale, ma esiste anche
          «Ingaggi conclusi che hai organizzato» e due sezioni quasi omonime
          nella stessa pagina si leggono male. Sono comunque due cose diverse:
          là hai pagato, qui sei stato pagato. */}
      <EventRecap title="Ingaggi che hai fatto" rows={completed} />
    </>
  );

  return (
    <div className="space-y-14">
      <SezioneHeader
        titolo="Ingaggi"
        sottotitolo={
          cercaArtisti
            ? "Quelli che hai pubblicato e le candidature che sono arrivate. Un annuncio con data, luogo e compenso in chiaro riceve risposte pertinenti; senza compenso ne riceve poche."
            : "Quelli a cui ti sei candidato, e come sono andati. Gli ingaggi aperti si trovano sulla mappa o nell'elenco pubblico."
        }
        // «Pubblicati» contava anche gli annunci di due anni fa: un numero che
        // sale e non scende mai non dice niente su oggi. Quello che conta è
        // quanti sono aperti adesso, perché è l'unico su cui si può agire.
        /* I numeri di un artista non sono quelli di chi organizza: «Aperti
           ora» e «Candidature da decidere» per lui valgono zero quasi sempre,
           e tre zeri in cima a una pagina la fanno sembrare rotta. */
        numeri={
          cercaArtisti
            ? [
                { label: ["Aperto ora", "Aperti ora"], valore: organizzatiAperti.length },
                { label: ["Candidatura da decidere", "Candidature da decidere"], valore: daDecidere },
                { label: ["Artista in attesa", "Artisti in attesa"], valore: daDecidere },
              ]
            : [
                { label: ["Candidatura attiva", "Candidature attive"], valore: upcoming.length },
                { label: ["Ingaggio fatto", "Ingaggi fatti"], valore: completed.length },
              ]
        }
        /* Il pulsante «Pubblica un ingaggio» in cima alla pagina di un artista
           proponeva come azione principale il mestiere dell'altro ruolo. Lui
           può ancora pubblicare — il ruolo non è un lucchetto — ma la sua
           azione principale è candidarsi, e quella vive negli elenchi
           pubblici. */
        azione={
          cercaArtisti ? (
            <Link href="/dashboard/eventi/nuovo" className="btn-primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Pubblica un ingaggio
            </Link>
          ) : (
            <Link href="/eventi" className="btn-primary">
              <Search className="h-4 w-4" aria-hidden="true" />
              Cerca un ingaggio
            </Link>
          )
        }
      />

      {/* ── L'ordine delle due metà dipende da chi guarda ──

          Era fisso: prima quello che organizzi, poi le tue candidature. Per un
          artista significava aprire «Ingaggi» e trovare come prima cosa uno
          stato vuoto che gli dice «pubblica il primo ingaggio» — cioè il
          mestiere dell'altro ruolo, proposto come sua azione principale, sopra
          la sola sezione per cui era venuto.

          Non è solo un ordine sbagliato: è una pagina che spiega a chi cerca
          lavoro come si assume. */}
      {cercaArtisti ? (
        <>
          {organizzati}
          {mieCandidature}
        </>
      ) : (
        <>
          {mieCandidature}
          {organizzati}
        </>
      )}

      <EventRecap title="Archivio" rows={archived} />
    </div>
  );
}

type Organizzato = {
  id: string;
  slug: string;
  title: string;
  city: string;
  startsAt: Date;
  _count: { participations: number };
  participations: { id: string }[];
};

/**
 * Una riga fra i propri annunci.
 *
 * `concluso` non cambia i dati, cambia quello che significano. «0
 * candidature» su un annuncio aperto è un invito a rilanciarlo; sullo stesso
 * annuncio a data passata è un consuntivo, e scritto uguale sarebbe una
 * bugia. Stessa cosa per il pulsante: «Gestisci» promette che c'è qualcosa da
 * decidere, e quando non c'è più si chiama «Vedi».
 *
 * Il bordo d'attesa resta anche sui conclusi, e di proposito: qualcuno che si
 * è candidato e non ha mai ricevuto risposta è un debito che la data non
 * cancella.
 */
function RigaOrganizzata({ e, concluso = false }: { e: Organizzato; concluso?: boolean }) {
  const inAttesa = e.participations.length;
  const n = e._count.participations;

  return (
    <li
      // Le righe con qualcuno in attesa si distinguono dal bordo: in un elenco
      // lungo il conteggio dentro il pulsante si perdeva, ed è l'unica cosa in
      // pagina che chiede un'azione.
      className={`card flex flex-wrap items-center justify-between gap-4 ${
        inAttesa > 0 ? "border-esito-attesa-tinta/40" : ""
      } ${concluso ? "opacity-75" : ""}`}
    >
      <div className="min-w-0">
        <Link
          href={`/eventi/${e.slug}`}
          className="text-fluid-sm font-semibold transition-colors hover:text-brand-600 dark:hover:text-brand-400"
        >
          {e.title}
        </Link>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-fluid-xs text-ink-muted">
          <span>{e.city}</span>
          <span aria-hidden="true" className="text-ink-faint">·</span>
          <span>{dataBreve(e.startsAt)}</span>
          <span aria-hidden="true" className="text-ink-faint">·</span>
          {/* Su un annuncio aperto «0 candidature» dice qualcosa che
              «candidature: 0» non dice: che è vivo e nessuno ha risposto. Su
              uno concluso quella lettura non regge più. */}
          <span>
            {concluso && n === 0
              ? "nessuna candidatura ricevuta"
              : conta(n, "candidatura", "candidature")}
          </span>
        </p>
      </div>
      <Link href={`/dashboard/eventi/${e.id}`} className="btn-ghost shrink-0">
        {concluso && inAttesa === 0 ? "Vedi" : "Gestisci"}
        {inAttesa > 0 && (
          <span className="ml-1.5 rounded-full bg-esito-attesa-tinta/15 px-2 py-0.5 text-fluid-xs font-bold tabular-nums text-esito-attesa">
            {inAttesa}
          </span>
        )}
      </Link>
    </li>
  );
}

type Row = {
  id: string;
  status: string;
  event: { slug: string; title: string; startsAt: Date; city: string };
};

/**
 * I tre riepiloghi delle proprie candidature.
 *
 * Quando sono vuoti spariscono del tutto invece di mostrare «niente qui per
 * ora» tre volte di fila. Tre sezioni vuote una sotto l'altra fanno sembrare
 * l'area personale rotta, e non aggiungono niente: l'assenza si vede già.
 */
function EventRecap({ title, rows, vuoto }: { title: string; rows: Row[]; vuoto?: ReactNode }) {
  if (rows.length === 0 && !vuoto) return null;

  return (
    <section>
      <h2 className="text-fluid-lg font-bold">{title}</h2>
      {rows.length === 0 ? (
        <div className="mt-5">{vuoto}</div>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((p) => (
            <li key={p.id} className="card flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <Link
                  href={`/eventi/${p.event.slug}`}
                  className="text-fluid-sm font-semibold transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                >
                  {p.event.title}
                </Link>
                <p className="mt-1 text-fluid-xs text-ink-muted">
                  {p.event.city} · {dataBreve(p.event.startsAt)}
                </p>
              </div>
              <StatoCandidatura stato={p.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
