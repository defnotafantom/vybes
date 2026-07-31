import { renderIndex, xmlResponse } from "@/lib/sitemap-xml";

export const revalidate = 3600;

/** Indice delle sitemap: tiene ogni file sotto il limite di 50.000 URL. */
export async function GET() {
  return xmlResponse(
    renderIndex([
      { loc: "/sitemap-statiche.xml" },
      { loc: "/sitemap-citta.xml" },
      { loc: "/sitemap-artisti.xml" },
      { loc: "/sitemap-eventi.xml" },
      { loc: "/sitemap-portfolio.xml" },
    ])
  );
}
