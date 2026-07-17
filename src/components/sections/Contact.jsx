import { getTranslations } from "next-intl/server";
import ContactForm from "@/components/ContactForm";

/** Contact block: quick channels + a spam-protected message form. Clinic
 * address/map render in the footer when Clinic Mode is on. */
export default async function Contact({ settings }) {
  const t = await getTranslations();
  const wa = settings?.contact_whatsapp
    ? `https://wa.me/${String(settings.contact_whatsapp).replace(/\D/g, "")}`
    : null;

  return (
    <section id="contact" className="bg-cream scroll-mt-28">
      <div className="mx-auto max-w-7xl px-4 py-14">
      <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8">
        <span className="title-accent">{t("sections.contactTitle")}</span>
      </h2>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3 text-ink-soft">
          {settings?.contact_phone && (
            <p>
              {t("contact.call")}:{" "}
              <a
                href={`tel:${String(settings.contact_phone).replace(/\s/g, "")}`}
                className="text-sage-deep font-semibold"
              >
                {settings.contact_phone}
              </a>
            </p>
          )}
          {wa && (
            <p>
              <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost inline-block">
                {t("contact.whatsapp")}
              </a>
            </p>
          )}
          {settings?.contact_email && (
            <p>
              {t("contact.email")}:{" "}
              <a href={`mailto:${settings.contact_email}`} className="text-sage-deep font-semibold">
                {settings.contact_email}
              </a>
            </p>
          )}
          {settings?.consultation_hours && (
            <p>
              {t("contact.hours")}: {settings.consultation_hours}
            </p>
          )}
        </div>
        <ContactForm />
      </div>
      </div>
    </section>
  );
}
