import { Fraunces, Nunito_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { getSettings } from "@/lib/settings";
import ServiceWorker from "@/components/ServiceWorker";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const FALLBACK_SEO = {
  seo_title: "Dr. Seema — Homoeopathic Physician",
  seo_description:
    "Book online homoeopathy consultations with Dr. Seema.",
};

export async function generateMetadata() {
  const s = await getSettings([
    "seo_title",
    "seo_description",
    "google_site_verification",
  ]).catch(() => FALLBACK_SEO);
  return {
    title: { default: s.seo_title, template: `%s · ${s.seo_title}` },
    description: s.seo_description,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        // ?v= busts the default favicon browsers cached before the ARYA one.
        { url: "/favicon.ico?v=2", sizes: "16x16 32x32 48x48" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ),
    // "./" resolves against each page's own path, so every page declares
    // itself canonical (drops ?query variants and other hostnames).
    alternates: { canonical: "./" },
    robots: {
      index: true,
      follow: true,
      googleBot: { "max-image-preview": "large", "max-snippet": -1 },
    },
    verification: s.google_site_verification
      ? { google: s.google_site_verification }
      : undefined,
    // og:image / twitter:image are filled in by src/app/opengraph-image.js.
    // Title and description are left out on purpose: Next then fills them
    // from each page's own title/description instead of the homepage's.
    openGraph: {
      type: "website",
      siteName: s.seo_title,
      locale: "en_IN",
      url: "./",
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport = {
  themeColor: "#7c8a6b",
};

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html
      lang={locale}
      className={`${display.variable} ${body.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        <ServiceWorker />
        <Analytics />
      </body>
    </html>
  );
}
