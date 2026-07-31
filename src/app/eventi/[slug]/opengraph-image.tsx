import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/constants";

export const runtime = "nodejs";
export const revalidate = 3600;
export const alt = "Ingaggio su Vybes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const event = await prisma.event.findFirst({
    where: { slug: params.slug, isPublic: true },
    select: {
      title: true, city: true, venueName: true, startsAt: true,
      category: true, isPaid: true, feeMin: true, feeMax: true,
    },
  });

  const title = event?.title ?? "Ingaggio";
  const cat = EVENT_CATEGORIES[(event?.category ?? "LIVE") as EventCategory]?.label ?? "Live";
  const date = event
    ? new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(event.startsAt)
    : "";
  const fee = event?.isPaid ? `${event.feeMin ?? 0}${event.feeMax && event.feeMax !== event.feeMin ? `–${event.feeMax}` : ""} €` : "";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #111827 0%, #4c1d95 55%, #7c3aed 100%)",
          padding: 72,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, opacity: 0.85 }}>
          <span>Vybes</span>
          <span>{cat}</span>
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, display: "flex" }}>
          {title.slice(0, 90)}
        </div>
        <div style={{ display: "flex", gap: 32, fontSize: 30, opacity: 0.9 }}>
          {date && <span>{date}</span>}
          {event?.city && <span>{event.venueName ? `${event.venueName}, ` : ""}{event.city}</span>}
          {fee && <span style={{ fontWeight: 700 }}>{fee}</span>}
        </div>
      </div>
    ),
    size
  );
}
