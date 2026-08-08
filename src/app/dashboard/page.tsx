import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Feed } from "@/components/Feed";
import { levelProgress } from "@/lib/levels";
import { missingForIndex } from "@/lib/profile-quality";
import { Plus, Search, Inbox, CalendarDays } from "lucide-react";
import Link from "next/link";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";
import { SchedaReputazione } from "@/components/dashboard/SchedaReputazione";
import { SchedaVetrina } from "@/components/dashboard/SchedaVetrina";
import { giornoDi, fraQuantiGiorni, POSTI_VETRINA } from "@/lib/vetrina";
import { ARTISTA_PUBBLICO } from "@/lib/visibilita";
import { dettaglioReputazioneDi } from "@/lib/reputazione-server";
import { vociMisurabili } from "@/lib/reputazione";
import { cerca, perRuolo, ruoloDi } from "@/lib/ruolo";
import { conta, concorda } from "@/lib/testo";

export const dynamic = "force-dynamic";

export const metadata = { title: "Feed" };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true, experience: true, reputation: true, slug: true, isPublic: true, role: true,
      bio: true, disciplines: true,
      _count: {
        select: {
          followers: true,
          posts: true,
          portfolioItems: { where: { isPublic: true } },
        },
      },
    },
  });

  const ruolo = ruoloDi(me?.role);
  const cercaArtisti = cerca(me?.role);

  const [quests, voci] = await Promise.all([
    prisma.quest.findMany({
      orderBy: { xpReward: "asc" },
      include: { progress: { where: { userId }, select: { current: true, completedAt: true } } },
    }),
    // Le stesse voci con cui il punteggio è stato calcolato: mostrarne una
    // versione riscritta a mano vorrebbe dire mantenerle allineate in due
    // posti. Il massimo arriva da lì per lo stesso motivo — dipende da quali
    // voci sono misurabili per questa persona, non solo dal suo ruolo.
    dettaglioReputazioneDi(userId),
  ]);

  /*
   * Il proprio posto nella fila della vetrina, e perché solo per gli artisti.
   *
   * Si legge lo stesso elenco che usa la home — stesso filtro, stesso ordine —
   * perché due liste costruite separatamente divergono, e qui divergere
   * significherebbe promettere un turno che non arriva. `select: { id }` e
   * basta: serve solo la posizione.
   *
   * `ARTISTA_PUBBLICO` filtra per ruolo, quindi per un organizzatore
   * `mioIndice` era **sempre** −1 e la scheda gli diceva ogni giorno «non sei
   * ancora in vetrina» a proposito di una vetrina che non lo riguarda. Duecento
   * righe lette a ogni caricamento per rispondere a una domanda che non aveva
   * fatto nessuno.
   */
  const rotazione = cercaArtisti
    ? []
    : await prisma.user.findMany({
        where: ARTISTA_PUBBLICO,
        orderBy: { createdAt: "asc" },
        take: 200,
        select: { id: true },
      });
  const mioIndice = rotazione.findIndex((u) => u.id === userId);

  /*
   * Quanto c'è di aperto, per chi organizza.
   *
   * «Da dove si comincia» era mostrato a ogni organizzatore a ogni
   * caricamento, anche al decimo annuncio pubblicato: un cartello che spiega
   * come cominciare a chi ha già cominciato. Ora l'invito compare finché non
   * si è pubblicato niente, e dopo lascia il posto a ciò che aspetta una
   * decisione — che è l'unica cosa in pagina su cui si può agire.
   */
  const [annunciPubblicati, daDecidere] = cercaArtisti
    ? await Promise.all([
        prisma.event.count({ where: { organizerId: userId, status: { not: "DRAFT" } } }),
        prisma.participation.count({ where: { status: "PENDING", event: { organizerId: userId } } }),
      ])
    : [0, 0];

  const progress = levelProgress(me?.experience ?? 0);

  // Gli obiettivi di un ruolo solo non si propongono all'altro: un
  // organizzatore vedeva «Portfolio solido — arriva a 5 lavori pubblicati»
  // ferma a 0/5 per sempre. Vedi `src/lib/ruolo.ts`.
  const pending = quests
    .filter((q) => perRuolo(q.ruoli, ruolo))
    .filter((q) => !q.progress[0]?.completedAt)
    .slice(0, 3);

  // Un profilo sotto la soglia non compare sui motori di ricerca. La regola
  // è nel codice, ma chi la subisce deve poterla vedere e soprattutto sapere
  // come uscirne: un filtro silenzioso che penalizza senza spiegare è la
  // versione peggiore di una regola giusta.
  const gaps = me
    ? missingForIndex({
        bio: me.bio,
        disciplines: me.disciplines,
        portfolioCount: me._count.portfolioItems,
      })
    : [];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <SezioneHeader
          titolo={`Ciao ${me?.name ?? ""}`}
          sottotitolo={
            cercaArtisti
              ? "Da qui pubblichi gli annunci e segui le candidature che arrivano."
              : "Il feed di chi segui. Le cose che ti riguardano — candidature, messaggi, decisioni — arrivano dalla campanella in alto."
          }
        />

        {/* Chi si iscrive per cercare artisti atterrava su un feed sociale con
            livelli, esperienza e quest: tutto pensato per chi si fa trovare,
            niente per chi cerca. Il primo passo di un organizzatore è uno solo,
            e va detto invece di lasciarlo dedurre dalla colonna laterale.

            Sparisce al primo annuncio pubblicato: da lì in poi non è più un
            aiuto, è un cartello che ripete una cosa già fatta. */}
        {cercaArtisti && annunciPubblicati === 0 && (
          <div className="card mb-8 border-brand-400/40">
            <p className="text-fluid-base font-semibold">Da dove si comincia</p>
            <p className="mt-2 text-fluid-sm text-ink-muted">
              Pubblica quello che cerchi e lascia che siano gli artisti a
              candidarsi. Con data, luogo e compenso in chiaro l&apos;annuncio
              riceve risposte pertinenti; senza compenso ne riceve poche.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/dashboard/eventi/nuovo" className="btn-primary">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Pubblica un ingaggio
              </Link>
              <Link href="/artisti" className="btn-ghost">
                Sfoglia gli artisti
              </Link>
            </div>
          </div>
        )}

        {/* ── Chi aspetta una risposta, prima di tutto il resto ──

            Il numero c'era già, nel contatore accanto alla voce «Ingaggi» del
            menu. Ma un contatore dice *quante*: non dice che dall'altra parte
            c'è una persona che ha scritto e sta aspettando, e soprattutto non
            si vede se non si guarda il menu.

            Questa è la cosa che l'organizzatore deve fare e l'unica che, se
            non fa, danneggia qualcun altro in silenzio. Va sopra il feed. */}
        {cercaArtisti && daDecidere > 0 && (
          <div className="card mb-8 border-esito-attesa-tinta/50 bg-esito-attesa-tinta/[0.06]">
            <h2 className="flex items-center gap-2 text-fluid-base font-semibold">
              <Inbox className="h-4 w-4 text-esito-attesa" aria-hidden="true" />
              {conta(daDecidere, "candidatura in attesa", "candidature in attesa")}
            </h2>
            <p className="mt-2 text-fluid-sm text-ink-muted">
              {concorda(daDecidere, "Una persona si è candidata", "Delle persone si sono candidate")}{" "}
              e non ha ancora saputo niente. Anche un no vale: chi aspetta ha
              bisogno di sapere, e chi riceve una risposta si ricandida.
            </p>
            <Link href="/dashboard/eventi" className="btn-primary mt-5 inline-flex">
              Vedi chi si è candidato
            </Link>
          </div>
        )}

        <Feed />
      </div>

      <aside className="space-y-6">
        {/* La soglia di indicizzazione riguarda chi vuole essere trovato. A un
            organizzatore che pubblica annunci non serve comparire su Google
            come profilo, e segnalarglielo sarebbe un allarme senza rimedio
            utile. */}
        {!cercaArtisti && me?.isPublic && gaps.length > 0 && (
          <div className="card border-gold-500/40 bg-gold-500/[0.06]">
            <h2 className="flex items-center gap-2 font-semibold">
              <Search className="h-4 w-4 text-gold-400" aria-hidden="true" />
              Non compari su Google
            </h2>
            <p className="mt-2 text-fluid-sm text-ink-muted">
              Il profilo è pubblico, ma troppo scarno perché i motori di ricerca
              lo mostrino. Chi ti cerca per nome ti trova; chi cerca la tua
              disciplina no.
            </p>
            <ul className="mt-3 space-y-2 text-fluid-sm">
              {gaps.map((g) => (
                <li key={g} className="flex gap-2">
                  <span aria-hidden="true" className="text-gold-400">
                    →
                  </span>
                  {g}
                </li>
              ))}
            </ul>
            <Link href="/dashboard/profilo" className="btn-ghost mt-4 inline-flex">
              Completa il profilo
            </Link>
          </div>
        )}

        {/* ── Perché la reputazione viene prima per chi organizza ──

            Per un artista la colonna comincia dal livello: è suo, sale con
            quello che fa, e la reputazione la spiega subito sotto.

            Per un organizzatore il livello non misura niente che gli
            interessi, mentre la reputazione contiene la voce che pesa un
            quarto del totale — se risponde a chi si candida. È l'unica cosa in
            questa colonna che cambia l'esperienza di qualcun altro. */}
        {cercaArtisti && (
          <SchedaReputazione
            voci={voci.voci}
            totale={vociMisurabili(voci.voci).reduce((s, v) => s + v.punti, 0)}
            massimo={voci.massimo}
          />
        )}

        {/* Livello e reputazione stavano nella stessa scheda, uno sopra
            l'altro, con la stessa grafica: era impossibile capire che uno è un
            progresso privato e l'altro il segnale che decide dove compari.
            Separarli in due schede è la spiegazione più economica possibile. */}
        <div className="card">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-fluid-sm font-semibold">Livello {progress.level}</h2>
            <span className="text-fluid-xs tabular-nums text-ink-faint">
              {progress.current}/{progress.needed} XP
            </span>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso verso il livello successivo"
          >
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-700 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-3 text-fluid-xs text-ink-muted">
            Sale con quello che fai qui dentro. Resta tuo: non decide come ti
            vedono gli altri.
          </p>
          <dl className="mt-4 border-t pt-3 text-fluid-xs">
            <div className="flex items-center justify-between">
              <dt className="text-ink-muted">
                {/* Chi segue un locale ne segue gli annunci: chiamarli
                    «follower» come per un artista suggerisce un pubblico, e
                    qui sono persone che vogliono sapere quando pubblichi. */}
                {cercaArtisti ? "Ti seguono" : "Follower"}
              </dt>
              <dd className="font-bold tabular-nums">{me?._count.followers}</dd>
            </div>
          </dl>
        </div>

        {/* La vetrina è la rotazione dei profili in home: riguarda chi vuole
            essere trovato, e un organizzatore non ci compare mai. */}
        {!cercaArtisti && (
          <>
            <SchedaVetrina
              ammesso={mioIndice >= 0}
              fraGiorni={fraQuantiGiorni(mioIndice, rotazione.length, POSTI_VETRINA, giornoDi())}
              quanti={rotazione.length}
            />

            <SchedaReputazione
              voci={voci.voci}
              totale={vociMisurabili(voci.voci).reduce((s, v) => s + v.punti, 0)}
              massimo={voci.massimo}
            />
          </>
        )}

        {/* Un collegamento ai propri annunci quando ce ne sono: la colonna di
            un organizzatore altrimenti parlerebbe solo di lui, e il suo lavoro
            qui dentro sono gli annunci. */}
        {cercaArtisti && annunciPubblicati > 0 && (
          <div className="card">
            <h2 className="flex items-center gap-2 text-fluid-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-ink-faint" aria-hidden="true" />
              I tuoi annunci
            </h2>
            <p className="mt-2 text-fluid-xs text-ink-muted">
              {conta(annunciPubblicati, "annuncio pubblicato", "annunci pubblicati")} in tutto.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/dashboard/eventi" className="btn-ghost">
                Gestisci
              </Link>
              <Link href="/dashboard/eventi/nuovo" className="btn-ghost">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nuovo
              </Link>
            </div>
          </div>
        )}

        {pending.length > 0 && (
          <div className="card">
            <h2 className="text-fluid-sm font-semibold">
              {cercaArtisti ? "Obiettivi in corso" : "Quest in corso"}
            </h2>
            <ul className="mt-3 space-y-4">
              {pending.map((q) => {
                const fatto = q.progress[0]?.current ?? 0;
                const perc = Math.min(100, Math.round((fatto / q.target) * 100));
                return (
                  <li key={q.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-fluid-sm font-medium">{q.title}</p>
                      <span className="shrink-0 text-fluid-xs font-bold tabular-nums text-brand-700 dark:text-brand-300">
                        +{q.xpReward}
                      </span>
                    </div>
                    <p className="mt-1 text-fluid-xs text-ink-muted">{q.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${perc}%` }} />
                      </div>
                      <span className="text-fluid-xs tabular-nums text-ink-faint">
                        {fatto}/{q.target}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link href="/dashboard/quest" className="btn-ghost mt-5 inline-flex">
              {cercaArtisti ? "Tutti gli obiettivi" : "Tutte le quest"}
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
