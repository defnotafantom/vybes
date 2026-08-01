import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/ProfileForm";
import { ZonaPericolosa } from "@/components/ZonaPericolosa";
import { fromCsv } from "@/lib/slug";

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
      <h1 className="text-2xl font-bold">Il tuo profilo</h1>
      <p className="mt-2 text-sm muted">
        Questi dati alimentano la tua pagina pubblica <code>/artisti/{me.slug}</code>, il titolo e la
        descrizione che compaiono su Google.
      </p>

      <div className="mt-8">
        <ProfileForm
          initial={{ ...profilo, disciplines: fromCsv(profilo.disciplines) }}
          cities={cities}
        />
      </div>

      <ZonaPericolosa haPassword={Boolean(password)} nome={profilo.name} />
    </div>
  );
}
