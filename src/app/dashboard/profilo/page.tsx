import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/ProfileForm";
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
      },
    }),
    prisma.city.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  if (!me) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Il tuo profilo</h1>
      <p className="mt-2 text-sm muted">
        Questi dati alimentano la tua pagina pubblica <code>/artisti/{me.slug}</code>, il titolo e la
        descrizione che compaiono su Google.
      </p>

      <div className="mt-8">
        <ProfileForm
          initial={{ ...me, disciplines: fromCsv(me.disciplines) }}
          cities={cities}
        />
      </div>
    </div>
  );
}
