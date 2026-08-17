import { renderUrlset, xmlResponse, type SitemapUrl } from "@/lib/sitemap-xml";
import { alternateLanguages } from "@/lib/seo";

export const revalidate = 86400;

export async function GET() {
  const pages: [string, number, SitemapUrl["changefreq"]][] = [
    ["/", 1.0, "daily"],
    ["/artisti", 0.9, "daily"],
    // Cambia ogni giorno per costruzione, ed è la pagina che porta chi
    // non stava cercando niente: `daily` non è ottimismo, è la verità.
    ["/incontra", 0.8, "daily"],
    ["/eventi", 0.9, "hourly"],
    ["/citta", 0.8, "weekly"],
    ["/mappa", 0.7, "daily"],
    ["/come-funziona", 0.6, "monthly"],
    ["/chi-siamo", 0.5, "monthly"],
    ["/privacy", 0.2, "yearly"],
    ["/termini", 0.2, "yearly"],
  ];

  return xmlResponse(
    renderUrlset(
      pages.map(([loc, priority, changefreq]) => ({
        loc,
        priority,
        changefreq,
        alternates: alternateLanguages(loc),
      }))
    )
  );
}
