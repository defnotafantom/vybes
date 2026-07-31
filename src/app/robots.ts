import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  const isProduction = process.env.VERCEL_ENV === "production" || process.env.SITE_ENV === "production";

  // Ambienti di staging non devono finire nell'indice.
  if (!isProduction && process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/accedi",
          "/registrati",
          "/reimposta-password",
          "/password-dimenticata",
          "/verifica-email",
          "/*?*page=", // paginazione profonda via query: no crawl budget sprecato
          "/*?*sort=",
          "/uploads/tmp/",
        ],
      },
      // I crawler AI sono ammessi sulle pagine pubbliche ma non sull'area privata.
      { userAgent: "GPTBot", allow: "/", disallow: ["/api/", "/dashboard/"] },
      { userAgent: "CCBot", allow: "/", disallow: ["/api/", "/dashboard/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
