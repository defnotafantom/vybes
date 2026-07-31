import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { portfolioJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const revalidate = 3600;

async function getItem(slug: string) {
  return prisma.portfolioItem.findFirst({
    where: { slug, isPublic: true, user: { isPublic: true } },
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
      </article>
    </div>
  );
}
