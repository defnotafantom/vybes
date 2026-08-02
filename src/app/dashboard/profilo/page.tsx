import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/ProfileForm";
import { ZonaPericolosa } from "@/components/ZonaPericolosa";
import { fromCsv } from "@/lib/slug";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfiloPage() {
  const session = await auth();

  const [me, cities] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session!.user.id },
      select: {
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

  if (!me) return null;

  // L'hash resta sul server: al client arriva solo il fatto che una password
  // esista, che è tutto ciò che serve per scegliere come chiedere conferma.
  const { password, ...profilo } = me;

  return (
    <div className="mx-auto max-w-2xl">
      <SezioneHeader
        titolo="Profilo"
        sottotitolo={
          <>
            Questi dati alimentano la tua pagina pubblica{" "}
            <code className="text-ink">/artisti/{me.slug}</code>: sono il titolo
            e la descrizione che compaiono su Google, non solo quello che si
            vede sul sito.
          </>
        }
        azione={
          <Link href={`/artisti/${me.slug}`} className="btn-ghost" target="_blank">
            Vedi la pagina pubblica
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      <div>
        <ProfileForm
          initial={{ ...profilo, disciplines: fromCsv(profilo.disciplines) }}
          cities={cities}
        />
      </div>

      <ZonaPericolosa haPassword={Boolean(password)} nome={profilo.name} />
    </div>
  );
}
