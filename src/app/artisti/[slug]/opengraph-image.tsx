import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { fromCsv } from "@/lib/slug";
import { disciplineBySlug } from "@/lib/constants";

export const runtime = "nodejs";
export const revalidate = 86400;
export const alt = "Profilo artista su Vybes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Card social generata a runtime e messa in cache: ogni profilo condiviso
 * su WhatsApp/LinkedIn mostra nome, disciplina e città invece di un'immagine
 * generica. Impatta il CTR sui social, non il ranking.
 */
export default async function Image({ params }: { params: { slug: string } }) {
  const artist = await prisma.user.findFirst({
    where: { slug: params.slug, isPublic: true },
    select: { name: true, headline: true, city: true, disciplines: true },
  });

  const name = artist?.name ?? "Vybes";
  const disciplines = fromCsv(artist?.disciplines)
    .map((d) => disciplineBySlug(d)?.label ?? d)
    .slice(0, 3)
    .join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0c0c10 0%, #2e1065 60%, #6d28d9 100%)",
          padding: 72,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, opacity: 0.85, letterSpacing: -0.5 }}>Vybes</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>{name}</div>
          {disciplines && <div style={{ fontSize: 36, opacity: 0.9 }}>{disciplines}</div>}
          {artist?.headline && (
            <div style={{ fontSize: 28, opacity: 0.7, maxWidth: 900 }}>
              {artist.headline.slice(0, 110)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 28, fontSize: 26, opacity: 0.8 }}>
          {artist?.city && <span>{artist.city}</span>}
        </div>
      </div>
    ),
    size
  );
}
