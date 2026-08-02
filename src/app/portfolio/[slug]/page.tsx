import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { portfolioJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PROFILO_PUBBLICO } from "@/lib/visibilita";
import { Segnala } from "@/components/Segnala";
import { Avatar } from "@/components/ui/Avatar";
import { MessageSquare } from "lucide-react";

export const revalidate = 3600;

async function getItem(slug: string) {
  return prisma.portfolioItem.findFirst({
    where: { slug, isPublic: true, user: PROFILO_PUBBLICO },
    include: { user: { select: { slug: true, name: true, image: true, city: true, headline: true } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getItem(slug);
  if (!item) return buildMetadata({ title: "Opera non trovata", path: `/portfolio/${slug}`, noindex: true });

  return buildMetadata({
    title: `${item.title} — portfolio di ${item.user.name}`,
    description: item.description || `${item.title}, lavoro di ${item.user.name} nel portfolio pubblico su Vybes.`,
    path: `/portfolio/${item.slug}`,
    type: "article",
    publishedTime: item.createdAt,
    modifiedTime: item.updatedAt,
    images: item.mediaType === "image" ? [{ url: item.mediaUrl, alt: item.title }] : undefined,
  });
}

export default async function PortfolioItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getItem(slug);
  if (!item) notFound();

  // Altri lavori dello stesso artista: chi è arrivato qui cercando *questo*
  // lavoro è la persona più disposta a guardarne altri, e sono link interni
  // fra pagine indicizzate che prima non esistevano.
  const altri = await prisma.portfolioItem.findMany({
    where: { userId: item.userId, isPublic: true, slug: { not: item.slug } },
    orderBy: { position: "asc" },
    take: 3,
    select: { slug: true, title: true, mediaUrl: true, mediaType: true },
  });

  return (
    <div className="container-page py-10">
      <JsonLd
        data={portfolioJsonLd({
          title: item.title,
          slug: item.slug,
          description: item.description,
          mediaUrl: item.mediaUrl,
          mediaType: item.mediaType,
          year: item.year,
          authorName: item.user.name,
          authorSlug: item.user.slug,
          createdAt: item.createdAt,
        })}
      />
      <Breadcrumbs
        items={[
          { name: "Artisti", path: "/artisti" },
          { name: item.user.name, path: `/artisti/${item.user.slug}` },
          { name: item.title, path: `/portfolio/${item.slug}` },
        ]}
      />

      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold sm:text-4xl">{item.title}</h1>
        <p className="mt-3 muted">
          di{" "}
          <Link href={`/artisti/${item.user.slug}`} className="text-brand-600 hover:underline">
            {item.user.name}
          </Link>
          {item.year && ` · ${item.year}`}
          {item.user.city && ` · ${item.user.city}`}
        </p>

        <div className="mt-8 overflow-hidden rounded-xl bg-brand-50 dark:bg-white/5">
          {item.mediaType === "image" && (
            <Image
              src={item.mediaUrl}
              alt={item.title}
              width={1200}
              height={800}
              priority
              className="h-auto w-full object-cover"
            />
          )}
          {item.mediaType === "video" && (
            <video controls preload="metadata" className="w-full" aria-label={item.title}>
              <source src={item.mediaUrl} />
            </video>
          )}
          {item.mediaType === "audio" && (
            <audio controls preload="metadata" className="w-full p-6" aria-label={item.title}>
              <source src={item.mediaUrl} />
            </audio>
          )}
        </div>

        {item.description && (
          <div className="prose-vybes mt-8 whitespace-pre-line muted">{item.description}</div>
        )}

        {item.externalUrl && (
          <p className="mt-6">
            <a href={item.externalUrl} target="_blank" rel="noopener nofollow" className="btn-ghost">
              Vedi il progetto completo
            </a>
          </p>
        )}
        {/* ─────────────────── CHI L'HA FATTO ───────────────────
            Questa pagina era un vicolo cieco: mostrava il lavoro e finiva lì.
            Ed è una delle porte d'ingresso più probabili, perché chi cerca
            trova prima il lavoro della persona — «cover jazz Bologna», non un
            nome. Arrivava, guardava, e non aveva niente da fare.

            Il motivo per cui esiste il sito è che quel «mi piace» diventi un
            contatto: qui va detto di chi è il lavoro e come raggiungerlo. */}
        <aside className="card mt-14">
          <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">Il lavoro è di</p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Avatar name={item.user.name} src={item.user.image} size="md" />
            <div className="min-w-0 flex-1">
              <Link
                href={`/artisti/${item.user.slug}`}
                className="text-fluid-lg font-bold tracking-tight transition-colors hover:text-brand-600 dark:hover:text-brand-400"
              >
                {item.user.name}
              </Link>
              <p className="mt-0.5 text-fluid-sm text-ink-muted">
                {[item.user.headline, item.user.city].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/dashboard/messaggi/nuovo?a=${item.user.slug}`} className="btn-primary">
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Contatta {item.user.name.split(" ")[0]}
            </Link>
            <Link href={`/artisti/${item.user.slug}`} className="btn-ghost">
              Vedi il profilo
            </Link>
          </div>
        </aside>

        {altri.length > 0 && (
          <section className="mt-14">
            <p className="eyebrow">Dello stesso artista</p>
            <h2 className="mt-2 text-fluid-xl">Altri lavori</h2>

            <ul className="mt-6 grid gap-4 sm:grid-cols-3">
              {altri.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/portfolio/${a.slug}`}
                    className="card-interactive group block overflow-hidden p-0"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
                      {a.mediaType === "image" && (
                        <Image
                          src={a.mediaUrl}
                          alt={a.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 30vw"
                          className="object-cover transition-transform duration-600 ease-out group-hover:scale-105"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <p className="p-3 text-fluid-sm font-medium transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      {a.title}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-12 border-t pt-6">
          <Segnala targetType="PORTFOLIO" targetId={item.slug} etichetta="Segnala questo lavoro" />
        </div>
      </article>
    </div>
  );
}
