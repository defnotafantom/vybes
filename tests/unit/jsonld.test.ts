import { describe, it, expect, beforeEach } from "vitest";
import { artistJsonLd, eventJsonLd, breadcrumbJsonLd, faqJsonLd, organizationJsonLd } from "@/lib/jsonld";

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://vybeshub.art";
});

describe("artistJsonLd", () => {
  const base = {
    name: "Chiara Bellandi",
    slug: "chiara-bellandi",
    headline: "Cantautrice",
    bio: null,
    image: "/uploads/a.jpg",
    city: "Milano",
    region: "Lombardia",
    disciplines: ["Cantante"],
    sameAs: ["https://instagram.com/x"],
  };

  it("usa Person per un artista singolo", () => {
    expect(artistJsonLd(base)["@type"]).toBe("Person");
  });

  it("usa MusicGroup per le band", () => {
    expect(artistJsonLd({ ...base, isBand: true })["@type"]).toBe("MusicGroup");
  });

  it("include l'indirizzo quando la città è nota", () => {
    const out = artistJsonLd(base) as Record<string, Record<string, string>>;
    expect(out.address.addressLocality).toBe("Milano");
    expect(out.address.addressCountry).toBe("IT");
  });

  it("omette i campi vuoti invece di emetterli null", () => {
    const out = artistJsonLd({ ...base, city: null, region: null, sameAs: [], headline: null });
    expect(out).not.toHaveProperty("address");
    expect(out).not.toHaveProperty("sameAs");
    expect(out).not.toHaveProperty("description");
  });
});

describe("eventJsonLd", () => {
  const event = {
    title: "Live al Bellezza",
    slug: "live-al-bellezza-milano",
    description: "Serata live",
    coverImage: null,
    startsAt: new Date("2026-09-01T20:00:00Z"),
    endsAt: new Date("2026-09-01T23:00:00Z"),
    status: "PUBLISHED",
    venueName: "Circolo Bellezza",
    address: "Via Bellezza 6",
    city: "Milano",
    region: "Lombardia",
    latitude: 45.45,
    longitude: 9.19,
    isPaid: true,
    feeMin: 250,
    feeMax: 400,
    currency: "EUR",
    organizerName: "Circolo",
    organizerSlug: "circolo",
    capacity: 6,
  };

  it("produce un Event con date ISO e geo", () => {
    const out = eventJsonLd(event) as Record<string, any>;
    expect(out["@type"]).toBe("Event");
    expect(out.startDate).toBe("2026-09-01T20:00:00.000Z");
    expect(out.location.geo.latitude).toBe(45.45);
  });

  it("mappa lo stato annullato su EventCancelled", () => {
    const out = eventJsonLd({ ...event, status: "CANCELLED" }) as Record<string, string>;
    expect(out.eventStatus).toBe("https://schema.org/EventCancelled");
  });

  it("emette l'offerta solo per gli ingaggi retribuiti", () => {
    expect(eventJsonLd(event)).toHaveProperty("offers");
    expect(eventJsonLd({ ...event, isPaid: false })).not.toHaveProperty("offers");
  });
});

describe("breadcrumb e faq", () => {
  it("numera le posizioni a partire da 1", () => {
    const out = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Artisti", path: "/artisti" },
    ]) as Record<string, any>;
    expect(out.itemListElement[0].position).toBe(1);
    expect(out.itemListElement[1].position).toBe(2);
  });

  it("costruisce una FAQPage con le risposte", () => {
    const out = faqJsonLd([{ q: "Costa?", a: "No" }]) as Record<string, any>;
    expect(out["@type"]).toBe("FAQPage");
    expect(out.mainEntity[0].acceptedAnswer.text).toBe("No");
  });

  it("collega WebSite e Organization con lo stesso @id", () => {
    const graph = (organizationJsonLd() as Record<string, any>)["@graph"];
    expect(graph[1].publisher["@id"]).toBe(graph[0]["@id"]);
  });
});
