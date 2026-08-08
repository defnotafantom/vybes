import Link from "next/link";
import { Coins, Trophy } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";
import { EmptyState } from "@/components/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Gioco } from "@/components/orecchio/Gioco";
import { giornoDi } from "@/lib/vetrina";
import { giorniAllaFine, settimanaDi } from "@/lib/orecchio";
import { turnoDi, senzaRisposte, partitaDiOggi, classificaDi } from "@/lib/orecchio-server";
import { conta } from "@/lib/testo";

export const dynamic = "force-dynamic";

export const metadata = { title: "L'orecchio" };

export default async function OrecchioPage() {
  const session = await auth();
  const userId = session!.user.id;
  const giorno = giornoDi();

  const [domande, gia, classifica, me] = await Promise.all([
    turnoDi(giorno),
    partitaDiOggi(userId, giorno),
    classificaDi(settimanaDi(giorno)),
    prisma.user.findUnique({ where: { id: userId }, select: { monete: true, slug: true } }),
  ]);

  const turno = senzaRisposte(giorno, domande);
  const mioPosto = classifica.righe.find((r) => r.slug === me?.slug);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <SezioneHeader
          titolo="L'orecchio"
          sottotitolo="Cinque lavori di artisti iscritti qui. Indovina di chi sono. Il turno è lo stesso per tutti e cambia ogni giorno — ed è per questo che la classifica significa qualcosa."
          numeri={[
            { label: "Monete", valore: me?.monete ?? 0 },
            { label: ["Punto in classifica", "Punti in classifica"], valore: mioPosto?.punti ?? 0 },
          ]}
        />

        {domande.length === 0 ? (
          /* Non è un errore ed è importante non farlo sembrare tale: mancano
             artisti con dei lavori caricati, e l'unica cosa sensata da fare è
             dirlo e indicare la strada — che per un artista è caricare il
             proprio, contribuendo al gioco e al proprio profilo insieme. */
          <EmptyState
            title="Il gioco apre quando ci sono abbastanza lavori"
            body="Servono almeno quattro artisti con un'opera pubblicata: sotto quella soglia una delle quattro risposte si ripeterebbe e la domanda si risolverebbe senza ascoltare niente. Puoi essere uno di loro."
            ctaLabel="Carica un lavoro"
            ctaHref="/dashboard/portfolio"
          />
        ) : gia ? (
          <div className="card text-center">
            <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">Hai già giocato oggi</p>
            <p className="mt-3">
              <span className="text-fluid-3xl font-bold tabular-nums">{gia.punteggio}</span>
              <span className="text-fluid-base text-ink-faint">/{turno.massimo}</span>
            </p>
            <p className="mt-2 text-fluid-sm text-ink-muted">
              {gia.corrette} su {domande.length} indovinate.
            </p>
            {/* Perché una sola partita al giorno, detto invece che subìto: un
                divieto senza motivo si legge come un difetto. */}
            <p className="mx-auto mt-5 max-w-md text-fluid-xs text-ink-faint">
              Il turno di oggi è lo stesso per tutti, quindi rigiocarlo
              significherebbe rispondere a domande di cui conosci già la
              soluzione. Domani ce n&apos;è uno nuovo.
            </p>
            <Link href="/artisti" className="btn-ghost mt-6 inline-flex">
              Intanto sfoglia gli artisti
            </Link>
          </div>
        ) : (
          <Gioco giorno={turno.giorno} domande={turno.domande} massimo={turno.massimo} />
        )}
      </div>

      <aside className="space-y-6">
        <div className="card">
          <h2 className="flex items-center gap-2 text-fluid-sm font-semibold">
            <Coins className="h-4 w-4 text-gold-400" aria-hidden="true" />
            Le tue monete
          </h2>
          <p className="mt-3 text-fluid-2xl font-bold tabular-nums">{me?.monete ?? 0}</p>
          <p className="mt-2 text-fluid-xs text-ink-muted">
            Si spendono in cornici, temi ed emblemi. Non comprano visibilità:
            la posizione negli elenchi si guadagna in un modo solo, ed è
            lavorare.
          </p>
        </div>

        <section className="card">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="flex items-center gap-2 text-fluid-sm font-semibold">
              <Trophy className="h-4 w-4 text-gold-400" aria-hidden="true" />
              Classifica
            </h2>
            {/* Il conto alla rovescia è il motivo per cui una classifica che si
                azzera funziona: senza, «ricomincia lunedì» è un'informazione
                che nessuno tiene a mente. */}
            <span className="text-fluid-xs text-ink-faint">
              {conta(giorniAllaFine(giorno), "giorno", "giorni")} alla fine
            </span>
          </div>

          {classifica.righe.length === 0 ? (
            <p className="mt-4 text-fluid-sm text-ink-muted">
              Questa settimana non ha ancora giocato nessuno. Il primo punto
              vale un primo posto.
            </p>
          ) : (
            <ol className="mt-4 space-y-3">
              {classifica.righe.slice(0, 10).map((r) => {
                const io = r.slug === me?.slug;
                return (
                  <li
                    key={r.slug}
                    className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                      io ? "bg-brand-500/10" : ""
                    }`}
                  >
                    <span
                      className={`w-5 shrink-0 text-right text-fluid-xs font-bold tabular-nums ${
                        r.posizione <= 3 ? "text-gold-400" : "text-ink-faint"
                      }`}
                    >
                      {r.posizione}
                    </span>
                    <Avatar name={r.nome} src={r.immagine} size="sm" />
                    <Link
                      href={`/artisti/${r.slug}`}
                      className="min-w-0 flex-1 truncate text-fluid-sm font-medium transition-colors hover:text-brand-600"
                    >
                      {r.nome}
                    </Link>
                    <span className="shrink-0 text-fluid-sm font-bold tabular-nums">{r.punti}</span>
                  </li>
                );
              })}
            </ol>
          )}

          <p className="mt-5 border-t pt-4 text-fluid-xs text-ink-muted">
            Si azzera ogni lunedì. Una classifica che non riparte la vince chi
            è arrivato per primo, e dopo un mese nessun altro prova più.
          </p>
        </section>
      </aside>
    </div>
  );
}
