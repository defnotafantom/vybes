import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/ProfileForm";
import { ZonaPericolosa } from "@/components/ZonaPericolosa";
import { fromCsv } from "@/lib/slug";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { SchedaReputazione } from "@/components/dashboard/SchedaReputazione";
import { dettaglioReputazioneDi } from "@/lib/reputazione-server";
import { vociMisurabili } from "@/lib/reputazione";
import { cerca, ruoloDi } from "@/lib/ruolo";
import { ScegliRuolo } from "@/components/ScegliRuolo";

export const dynamic = "force-dynamic";

export const metadata = { title: "Profilo" };

export default async function ProfiloPage() {
  const session = await auth();

  const [me, cities] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session!.user.id },
      select: {
        role: true,
        name: true, slug: true, headline: true, bio: true, disciplines: true, citySlug: true, image: true,
        website: true, instagram: true, spotify: true, youtube: true, isPublic: true,
        // Serve solo a sapere *come* chiedere la riconferma per la
        // cancellazione: chi è entrato con Google non ha una password da
        // riscrivere. L'hash non esce da qui.
        password: true,
      },
    }),
    prisma.city.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  // Il dettaglio della reputazione sta anche in dashboard, ma lì informa e
  // basta. Qui accompagna l'unica pagina in cui quei campi si possono davvero
  // riempire: leggerlo altrove e agire qui significava tenere a mente un
  // elenco mentre si compila un modulo.
  const { voci, massimo } = await dettaglioReputazioneDi(session!.user.id);
  // Le voci non ancora misurabili — «rispondi a chi si candida» prima della
  // terza candidatura — restano fuori dal totale come sono fuori dal massimo.
  // Sommarle qui e non là darebbe una frazione con numeratore e denominatore
  // calcolati su insiemi diversi.
  const totale = vociMisurabili(voci).reduce((s, v) => s + v.punti, 0);

  if (!me) return null;

  // L'hash resta sul server: al client arriva solo il fatto che una password
  // esista, che è tutto ciò che serve per scegliere come chiedere conferma.
  const { password, role, ...profilo } = me;
  const cercaArtisti = cerca(role);

  return (
    <div className="mx-auto max-w-2xl">
      <SezioneHeader
        titolo="Profilo"
        sottotitolo={
          cercaArtisti ? (
            <>
              È la pagina che un artista apre prima di decidere se candidarsi a
              un tuo annuncio: <code className="text-ink">/artisti/{me.slug}</code>.
              Un profilo vuoto riceve molte meno candidature di uno che dice
              dove si suona e che serate fate.
            </>
          ) : (
            <>
              Questi dati alimentano la tua pagina pubblica{" "}
              <code className="text-ink">/artisti/{me.slug}</code>: sono il titolo
              e la descrizione che compaiono su Google, non solo quello che si
              vede sul sito.
            </>
          )
        }
        azione={
          <Link href={`/artisti/${me.slug}`} className="btn-ghost" target="_blank">
            {cercaArtisti ? "Come ti vedono" : "Vedi la pagina pubblica"}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      {/* Prima del modulo, non dopo: dice cosa vale la pena compilare mentre
          si sta per compilarlo. */}
      <div className="mb-8">
        <SchedaReputazione voci={voci} totale={totale} massimo={massimo} compatta />
      </div>

      <div>
        <ProfileForm
          initial={{ ...profilo, disciplines: fromCsv(profilo.disciplines) }}
          cities={cities}
          ruolo={ruoloDi(role)}
        />
      </div>

      {/* ── Il ruolo, fra il profilo e la zona pericolosa ──

          Non è un campo del modulo: cambiarlo non è come cambiare la
          biografia, cambia **quale formula ti misura** — le voci della
          reputazione, gli obiettivi che ti si propongono, i distintivi che la
          tua pagina può mostrare. Mescolarlo agli altri campi lo farebbe
          sembrare un dettaglio, e verrebbe modificato per sbaglio salvando
          altro.

          Sotto il modulo e sopra la cancellazione: è più impegnativo di un
          campo e meno irreversibile di chiudere l'account. */}
      <section className="mt-14 border-t pt-10">
        <h2 className="text-fluid-lg font-bold">Che cosa fai qui</h2>
        <p className="mt-2 max-w-xl text-fluid-sm text-ink-muted">
          Le due cose possono coesistere: un locale con una band residente, un
          collettivo che organizza la propria rassegna. Cambiando, il menu e la
          scheda reputazione si aggiornano subito.
        </p>
        <div className="mt-6">
          <ScegliRuolo attuale={ruoloDi(role)} etichettaConferma="Salva il ruolo" />
        </div>
      </section>

      <ZonaPericolosa haPassword={Boolean(password)} nome={profilo.name} />
    </div>
  );
}
