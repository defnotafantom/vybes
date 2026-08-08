import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";
import { Vetrinetta } from "@/components/negozio/Vetrinetta";
import { COSMETICI } from "@/lib/cosmetici";
import { possessiDi } from "@/lib/negozio";

export const dynamic = "force-dynamic";

export const metadata = { title: "Negozio" };

export default async function NegozioPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [me, possessi] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { monete: true } }),
    possessiDi(userId),
  ]);

  const miei = new Map(possessi.map((p) => [p.cosmeticoId, p]));

  /*
   * L'elenco è il catalogo, non i possessi.
   *
   * Costruirlo dai possessi mostrerebbe solo ciò che si ha già, cioè un
   * negozio senza niente da comprare. Il verso giusto è l'opposto: si parte da
   * tutto quello che esiste e si segna cosa è già in mano.
   *
   * L'ordine mette davanti il possibile: prima quello che si può prendere
   * adesso, poi quello che si ha già, e in fondo quello che non è in vendita.
   * Aprendo la pagina si vede subito se c'è qualcosa da fare — che è l'unica
   * domanda che ci si fa entrando in un negozio.
   */
  const voci = COSMETICI.map((c) => {
    const mio = miei.get(c.id);
    return { ...c, posseduto: Boolean(mio), indossato: Boolean(mio?.indossato) };
  }).sort((a, b) => {
    const rango = (v: (typeof voci)[number]) => (v.prezzo === null ? 2 : v.posseduto ? 1 : 0);
    return rango(a) - rango(b) || (a.prezzo ?? 0) - (b.prezzo ?? 0);
  });

  return (
    <div className="mx-auto max-w-4xl">
      <SezioneHeader
        titolo="Negozio"
        sottotitolo="Cornici, temi, emblemi. Servono a distinguerti, non ad arrivare prima di qualcun altro: quello che decide dove compari si guadagna lavorando, e non è in vendita a nessun prezzo."
        numeri={[
          { label: "Monete", valore: me?.monete ?? 0 },
          { label: ["Oggetto tuo", "Oggetti tuoi"], valore: possessi.length },
        ]}
      />

      <Vetrinetta voci={voci} saldo={me?.monete ?? 0} />
    </div>
  );
}
