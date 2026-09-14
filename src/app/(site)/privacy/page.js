import { getTranslations } from "next-intl/server";
import { getSettings } from "@/lib/settings";

export async function generateMetadata() {
  const t = await getTranslations("seo");
  return { title: "Privacy Policy", description: t("privacyDescription") };
}

export default async function PrivacyPage() {
  const s = await getSettings(["contact_email", "payee_name"]).catch(() => ({}));
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 prose-warm">
      <h1 className="font-display text-3xl text-sage-deep font-semibold mb-6">
        Privacy Policy
      </h1>
      <div className="space-y-4 text-ink-soft leading-relaxed">
        <p>
          This site collects only the information needed to book and deliver
          your consultation: your name, phone number, optional email, and any
          details you choose to share in the pre-consultation form.
        </p>
        <p>
          <strong className="text-ink">How we use it.</strong> Your details are
          used solely to schedule, confirm and follow up on your appointment,
          and to send you booking-related messages by SMS, email or WhatsApp.
          We do not sell or share your data with third parties for marketing.
        </p>
        <p>
          <strong className="text-ink">Payments.</strong> Payments are made
          directly to the doctor&apos;s UPI account. We store only the
          transaction reference you enter, to verify your payment.
        </p>
        <p>
          <strong className="text-ink">Retention.</strong> Consultation records
          are retained in line with applicable medical-record norms and then
          archived securely. You may request access to or deletion of your
          personal data (subject to record-keeping obligations) under the
          Digital Personal Data Protection Act, 2023.
        </p>
        <p>
          <strong className="text-ink">Contact.</strong> For any privacy
          request, write to{" "}
          {s.contact_email ? (
            <a href={`mailto:${s.contact_email}`} className="text-sage-deep">
              {s.contact_email}
            </a>
          ) : (
            "the clinic"
          )}
          .
        </p>
      </div>
    </article>
  );
}
