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
  const data = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: profile?.name || "Dr. Seema",
    medicalSpecialty: "Homeopathic",
    url: siteUrl,
    image: profile?.heroImage || undefined,
    description: settings?.seo_description || undefined,
    telephone: settings?.contact_phone || undefined,
    email: settings?.contact_email || undefined,
    priceRange: "₹₹",
    address:
      settings?.site_mode === "online+clinic" && settings?.clinic_address
        ? { "@type": "PostalAddress", streetAddress: settings.clinic_address }
        : undefined,
  };
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
