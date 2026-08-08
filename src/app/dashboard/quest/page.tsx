import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { levelProgress } from "@/lib/levels";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";
import { ElencoQuest, type QuestVista } from "@/components/dashboard/ElencoQuest";
import { cerca, perRuolo, ruoloDi } from "@/lib/ruolo";

export const dynamic = "force-dynamic";

export const metadata = { title: "Quest" };

export default async function QuestPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [quests, me] = await Promise.all([
    prisma.quest.findMany({
      orderBy: { xpReward: "asc" },
      include: { progress: { where: { userId } } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { experience: true, role: true } }),
  ]);

  const progress = levelProgress(me?.experience ?? 0);
  const ruolo = ruoloDi(me?.role);
  const cercaArtisti = cerca(me?.role);

  /*
   * ── Perché l'elenco non è lo stesso per tutti ──
   *
   * Lo era, e un organizzatore ci trovava «Prima opera», «Portfolio solido —
   * arriva a 5 lavori pubblicati» e «Prima candidatura»: tre voci su otto che
   * il suo ruolo non raggiunge, ferme a zero per sempre, in una pagina che si
   * chiama Obiettivi. Non è una svista estetica — è il sistema che promette
   * qualcosa che non può mantenere, e chi lo legge impara a ignorare la
   * pagina intera, comprese le voci che invece valevano.
   *
   * Il filtro sta qui e non nella query perché la regola vive in
   * `src/lib/ruolo.ts` insieme alla sua spiegazione, e perché le quest sono
   * dieci: leggerle tutte e scartarne quattro costa meno di una condizione
   * SQL che ripete a metà una regola scritta altrove.
   */
  const mie = quests.filter((q) => perRuolo(q.ruoli, ruolo));

  /*
   * ── Perché le quest riscosse spariscono ──
   *
   * Restavano nell'elenco, sbiadite, «per mostrare la strada fatta». Con otto
   * voci significa che dopo un mese metà dell'elenco è fatto di cose su cui
   * non c'è più niente da fare, e chi lo apre deve scartarle con l'occhio
   * ogni volta per trovare le due che contano.
   *
   * La strada fatta la dicono già il livello e l'XP, che stanno lì sopra e
   * non costano una riga a testa. Un elenco di obiettivi serve a dire cosa
   * manca: quando una voce non manca più, il suo posto vale più di lei.
   *
   * È anche ciò che rende sensato il riscatto. Finché la ricompensa arrivava
   * da sola, una quest completata non aveva motivo di uscire di scena e
   * restava lì per sempre.
   */
  const aperte: QuestVista[] = mie
    .filter((q) => !q.progress[0]?.riscossaIl)
    .map((q) => ({
      key: q.key,
      titolo: q.title,
      descrizione: q.description,
      xp: q.xpReward,
      target: q.target,
      current: q.progress[0]?.current ?? 0,
      completata: Boolean(q.progress[0]?.completedAt),
    }));

  const chiuse = mie.length - aperte.length;
  const daRiscuotere = aperte.filter((q) => q.completata).length;

  return (
    <div className="mx-auto max-w-3xl">
      <SezioneHeader
        titolo={cercaArtisti ? "Obiettivi" : "Quest"}
        // «Rende il profilo più facile da trovare» è la promessa giusta per
        // chi vuole essere trovato, e la promessa sbagliata per chi cerca: a
        // lui questi obiettivi servono a farsi scegliere da chi si candida.
        sottotitolo={
          cercaArtisti
            ? "Ognuno corrisponde a qualcosa che rende più probabile ricevere candidature buone: un profilo che dice chi sei, annunci chiari, risposte a chi scrive."
            : "Obiettivi che portano a completare il profilo. Non sono un gioco fine a sé stesso: ognuno corrisponde a qualcosa che rende il profilo più facile da trovare."
        }
        numeri={[
          {
            label: ["Ricompensa da riscuotere", "Ricompense da riscuotere"],
            valore: daRiscuotere,
          },
          cercaArtisti
            ? { label: ["Obiettivo chiuso", "Obiettivi chiusi"], valore: chiuse }
            : { label: ["Quest chiusa", "Quest chiuse"], valore: chiuse },
          { label: "Livello", valore: progress.level },
        ]}
      />

      {/* Il livello prima delle quest: è la cosa che le quest servono a far
          salire, e metterlo dopo l'elenco lo trasformava in una nota a piè di
          pagina. Ora vive dentro `ElencoQuest`, perché l'XP riscosso deve
          sapere dove volare. */}
      <ElencoQuest iniziali={aperte} livelloIniziale={progress} />
    </div>
  );
}
