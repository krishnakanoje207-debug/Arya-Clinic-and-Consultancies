/** JSON for an inline <script>: escape "<" so admin-entered text containing
 * "</script>" can't close the tag early. Still valid JSON for parsers. */
export function jsonLdHtml(data) {
  return JSON.stringify(data).replace(/</g, "\\" + "u003c");
}

/**
 * Physician / MedicalBusiness structured data (schema.org) for local SEO.
 * Rendered server-side into the page; Google reads it for rich results.
 */
export default function JsonLd({ profile, settings }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  // Structured data must carry absolute URLs; profile images may be /paths.
  const abs = (u) => (u ? new URL(u, siteUrl).href : undefined);
  const physician = {
    "@type": "Physician",
    "@id": `${siteUrl}/#physician`,
    name: profile?.name || "Dr. Seema",
    medicalSpecialty: "Homeopathic",
    url: siteUrl,
    image: abs(profile?.heroImage),
    logo: abs("/brand/arya-logo.png"),
    description: settings?.seo_description || undefined,
    telephone: settings?.contact_phone || undefined,
    email: settings?.contact_email || undefined,
    priceRange: "₹₹",
    sameAs: settings?.google_reviews_url ? [settings.google_reviews_url] : undefined,
    address:
      settings?.site_mode === "online+clinic" && settings?.clinic_address
        ? { "@type": "PostalAddress", streetAddress: settings.clinic_address }
        : undefined,
  };
  // WebSite node: lets Google show the brand as the site name in results.
  const website = {
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: settings?.brand_name || undefined,
    alternateName: settings?.seo_title || undefined,
    url: siteUrl,
    publisher: { "@id": physician["@id"] },
  };
  const data = { "@context": "https://schema.org", "@graph": [physician, website] };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }}
    />
  );
}

/** FAQPage markup — harmless even where Google limits rich FAQ results. */
export function FaqJsonLd({ faqs, locale }) {
  if (!faqs?.length) return null;
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: (locale === "hi" && f.questionHi) || f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: (locale === "hi" && f.answerHi) || f.answer,
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }}
    />
  );
}
