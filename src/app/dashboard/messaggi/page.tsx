import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

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
        numeri={parts.length > 0 ? [{ label: "Conversazioni", valore: parts.length }] : undefined}
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
            return (
              <li key={p.conversationId}>
                <Link
                  href={`/dashboard/messaggi/${p.conversationId}`}
                  className="card-interactive flex items-center gap-4"
                >
<Avatar name={other?.name ?? "?"} src={other?.image} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{other?.name ?? "Utente rimosso"}</span>
                    <span className="block truncate text-sm muted">{last?.content ?? "Nessun messaggio"}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
