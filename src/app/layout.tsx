import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { SITE, siteUrl } from "@/lib/constants";
import { organizationJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/JsonLd";
import { alternateLanguages } from "@/lib/seo";
import { ThemeScript, ThemeToggle } from "@/components/ThemeToggle";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/Toast";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ServiceWorker } from "@/components/ServiceWorker";
import { NavProgress } from "@/components/NavProgress";
import { Logo } from "@/components/Logo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap", // evita il FOIT e non blocca il LCP
});

export const metadata: Metadata = {
  // metadataBase risolve tutti gli URL relativi in OG/canonical
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: siteUrl() }],
  creator: SITE.name,
  publisher: SITE.name,
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: siteUrl(), languages: alternateLanguages("/") },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: siteUrl(),
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    // Fallback per le pagine che non generano un'immagine propria.
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c10" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning className={`dark ${inter.variable}`}>
      <head>
        <ThemeScript />
        {/* Preconnessione anticipata al CDN delle tile della mappa */}
        <link rel="preconnect" href="https://tile.openstreetmap.org" crossOrigin="" />
      </head>
      <body className="min-h-screen font-sans">
        <a href="#main" className="skip-link">
          Salta al contenuto
        </a>
        <JsonLd data={organizationJsonLd()} />
        <SessionProvider>
          <ToastProvider>
            <NavProgress />
            <SiteHeader />
            <main id="main">{children}</main>
            <SiteFooter />
          </ToastProvider>
        </SessionProvider>
        <ServiceWorker />
        {/* Speed Insights raccoglie i Core Web Vitals dal traffico reale:
            sono gli stessi dati che Google usa come segnale di ranking. */}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-md"
      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--bg) / 0.85)" }}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Navigazione principale" className="hidden gap-6 text-sm md:flex">
          <Link href="/artisti" className="link-underline text-ink hover:text-brand-600">Artisti</Link>
          <Link href="/eventi" className="link-underline text-ink hover:text-brand-600">Ingaggi</Link>
          <Link href="/citta" className="link-underline text-ink hover:text-brand-600">Città</Link>
          <Link href="/mappa" className="link-underline text-ink hover:text-brand-600">Mappa</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/accedi" className="btn-ghost hidden sm:inline-flex">Accedi</Link>
          <Link href="/registrati" className="btn-primary">Iscriviti</Link>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-20 border-t py-12" style={{ borderColor: "rgb(var(--border))" }}>
      <div className="container-page grid gap-8 text-sm sm:grid-cols-2 md:grid-cols-4">
        <div>
          <Logo href={null} />
          <p className="mt-3 muted">{SITE.tagline}</p>
        </div>
        <nav aria-label="Scopri">
          <p className="mb-3 font-semibold">Scopri</p>
          <ul className="space-y-2 muted">
            <li><Link href="/artisti" className="hover:text-brand-600">Tutti gli artisti</Link></li>
            <li><Link href="/eventi" className="hover:text-brand-600">Ingaggi aperti</Link></li>
            <li><Link href="/mappa" className="hover:text-brand-600">Mappa degli ingaggi</Link></li>
            <li><Link href="/cerca" className="hover:text-brand-600">Ricerca</Link></li>
          </ul>
        </nav>
        <nav aria-label="Città principali">
          <p className="mb-3 font-semibold">Città</p>
          <ul className="space-y-2 muted">
            <li><Link href="/citta/milano" className="hover:text-brand-600">Artisti a Milano</Link></li>
            <li><Link href="/citta/roma" className="hover:text-brand-600">Artisti a Roma</Link></li>
            <li><Link href="/citta/napoli" className="hover:text-brand-600">Artisti a Napoli</Link></li>
            <li><Link href="/citta" className="hover:text-brand-600">Tutte le città</Link></li>
          </ul>
        </nav>
        <nav aria-label="Informazioni">
          <p className="mb-3 font-semibold">Vybes</p>
          <ul className="space-y-2 muted">
            <li><Link href="/chi-siamo" className="hover:text-brand-600">Chi siamo</Link></li>
            <li><Link href="/come-funziona" className="hover:text-brand-600">Come funziona</Link></li>
            <li><Link href="/privacy" className="hover:text-brand-600">Privacy</Link></li>
            <li><Link href="/termini" className="hover:text-brand-600">Termini</Link></li>
          </ul>
        </nav>
      </div>
      <p className="container-page mt-10 text-xs muted">
        © {new Date().getFullYear()} Vybes. Tutti i diritti riservati.
      </p>
    </footer>
  );
}
