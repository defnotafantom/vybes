import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";
import { EmptyState } from "@/components/EmptyState";
import { nonLetta } from "@/lib/attenzione";
import { quandoRelativo } from "@/lib/date";

export const dynamic = "force-dynamic";

export const metadata = { title: "Messaggi" };

export default async function MessaggiPage() {
  const session = await auth();
  const userId = session!.user.id;

  const parts = await prisma.conversationParticipant.findMany({
    where: { userId },
    orderBy: { conversation: { updatedAt: "desc" } },
    include: {
      conversation: {
        include: {
          participants: {
            where: { userId: { not: userId } },
            include: { user: { select: { slug: true, name: true, image: true } } },
          },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <SezioneHeader
        titolo="Messaggi"
        sottotitolo="Qui si concordano le cose che l'annuncio non dice: orari, brani, chi porta cosa. Le conversazioni nascono da «Contatta» su un profilo o da una candidatura accettata."
        numeri={parts.length > 0 ? [{ label: ["Conversazione", "Conversazioni"], valore: parts.length }] : undefined}
      />

      {parts.length === 0 ? (
        <EmptyState
          title="Nessuna conversazione"
          body="Si comincia sempre da una persona: apri un profilo e usa «Contatta», oppure candidati a un ingaggio e aspetta la risposta."
          ctaLabel="Sfoglia gli artisti"
          ctaHref="/artisti"
        />
      ) : (
        <ul className="space-y-2">
          {parts.map((p) => {
            const other = p.conversation.participants[0]?.user;
            const last = p.conversation.messages[0];
            // La regola per «non letta» esisteva già ed era usata solo per il
            // pallino nella barra laterale: l'elenco diceva che qualcosa era
            // arrivato ma non quale conversazione: bisognava aprirle tutte.
            const daLeggere = nonLetta(p.lastReadAt, last?.createdAt);

            return (
              <li key={p.conversationId}>
                <Link
                  href={`/dashboard/messaggi/${p.conversationId}`}
                  className={`card-interactive flex items-center gap-4 ${
                    daLeggere ? "border-brand-400/40" : ""
                  }`}
                >
                  <Avatar name={other?.name ?? "?"} src={other?.image} size="sm" />

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span
                        className={`truncate text-fluid-sm ${
                          daLeggere ? "font-bold" : "font-medium"
                        }`}
                      >
                        {other?.name ?? "Utente rimosso"}
                      </span>
                      {/* Quando, non solo cosa: un elenco ordinato per data
                          senza date costringe a indovinare se una risposta è
                          di ieri o di tre settimane fa. */}
                      {last && (
                        <span className="shrink-0 text-fluid-xs text-ink-faint">
                          {quandoRelativo(last.createdAt)}
                        </span>
                      )}
                    </span>
                    <span
                      className={`mt-0.5 block truncate text-fluid-sm ${
                        daLeggere ? "text-ink" : "text-ink-muted"
                      }`}
                    >
                      {last?.content ?? "Nessun messaggio"}
                    </span>
                  </span>

                  {daLeggere && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-brand-500"
                      // Il grassetto da solo non basta a chi legge con uno
                      // screen reader, e il pallino da solo non basta a chi
                      // non distingue i colori: servono entrambi più il testo.
                      role="img"
                      aria-label="Non letta"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
