import { siteUrl } from "@/lib/constants";

export type SitemapUrl = {
  loc: string;
  lastmod?: Date | string | null;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
  /** Alternative linguistiche: emesse come xhtml:link rel="alternate". */
  alternates?: Record<string, string>;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderUrlset(urls: SitemapUrl[]): string {
  const base = siteUrl();
  const body = urls
    .map((u) => {
      const loc = u.loc.startsWith("http") ? u.loc : `${base}${u.loc}`;
      const parts = [`    <loc>${esc(loc)}</loc>`];
      if (u.lastmod) parts.push(`    <lastmod>${new Date(u.lastmod).toISOString()}</lastmod>`);
      if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
      if (u.priority !== undefined) parts.push(`    <priority>${u.priority.toFixed(1)}</priority>`);
      for (const [lang, href] of Object.entries(u.alternates ?? {})) {
        parts.push(`    <xhtml:link rel="alternate" hreflang="${esc(lang)}" href="${esc(href)}"/>`);
      }
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>`;
}

export function renderIndex(sitemaps: { loc: string; lastmod?: Date }[]): string {
  const base = siteUrl();
  const body = sitemaps
    .map(
      (s) =>
        `  <sitemap>\n    <loc>${esc(`${base}${s.loc}`)}</loc>\n    <lastmod>${(
          s.lastmod ?? new Date()
        ).toISOString()}</lastmod>\n  </sitemap>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;
}

export function xmlResponse(xml: string, maxAge = 3600): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=86400`,
    },
  });
}
