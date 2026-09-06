"use client";

import { useActionState, useState, useTransition } from "react";
import { saveSettings, sendTestSms } from "@/app/admin/actions/settings";

function Field({ label, name, defaultValue, placeholder, hint, textarea }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-ink mb-1">{label}</span>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
        />
      )}
      {hint && <span className="block text-xs text-ink-soft mt-1">{hint}</span>}
    </label>
  );
}

function Section({ title, children }) {
  return (
    <div className="card-warm p-6 space-y-4">
      <h2 className="font-semibold text-ink">{title}</h2>
      {children}
    </div>
  );
}

function TestSmsButton() {
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState(null);
  const [pending, startTransition] = useTransition();

  function send() {
    setResult(null);
    startTransition(async () => {
      setResult(await sendTestSms(phone));
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+91 98765 43210"
        className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={send}
        disabled={pending || !phone}
        className="btn-ghost text-sm"
      >
        {pending ? "Sending…" : "Send test SMS"}
      </button>
      {result?.ok && <span className="text-sm text-sage-deep">✓ Sent</span>}
      {result?.error && (
        <span className="text-sm text-terracotta-deep w-full">{result.error}</span>
      )}
    </div>
  );
}

export default function SettingsForm({ settings }) {
  const [state, action, pending] = useActionState(saveSettings, null);
  const s = settings;

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <Section title="Toggles">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="clinic_mode"
            defaultChecked={s.site_mode === "online+clinic"}
            className="h-4 w-4 accent-[var(--sage)]"
          />
          <span className="text-sm">
            Enable <strong>Clinic Mode</strong> (adds clinic-visit booking,
            address + map)
          </span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="research_published"
            defaultChecked={Boolean(s.research_published)}
            className="h-4 w-4 accent-[var(--sage)]"
          />
          <span className="text-sm">
            Publish the <strong>Research</strong> section on the public site
          </span>
        </label>
        <label className="block pt-2">
          <span className="block text-sm font-semibold text-ink mb-1">
            Cancellation cutoff (hours before a confirmed appointment)
          </span>
          <input
            type="number"
            name="cancel_cutoff_hours"
            min="0"
            max="72"
            defaultValue={s.cancel_cutoff_hours ?? 4}
            className="w-32 rounded-lg border border-[var(--border)] px-3 py-2"
          />
          <span className="block text-xs text-ink-soft mt-1">
            Patients can&apos;t cancel/reschedule online within this window. 0 = always allowed.
          </span>
        </label>
      </Section>

      <Section title="UPI payment details">
        <Field label="UPI ID (VPA)" name="upi_id" defaultValue={s.upi_id} placeholder="name@bank" />
        <Field label="UPI-linked number" name="upi_number" defaultValue={s.upi_number} />
        <Field label="Payee name" name="payee_name" defaultValue={s.payee_name} hint="Exactly as registered on the UPI account." />
      </Section>

      <Section title="Contact">
        <Field label="Phone" name="contact_phone" defaultValue={s.contact_phone} />
        <Field label="WhatsApp number" name="contact_whatsapp" defaultValue={s.contact_whatsapp} hint="Digits only; used for the wa.me link." />
        <Field label="Email" name="contact_email" defaultValue={s.contact_email} />
        <Field
          label="Google reviews link"
          name="google_reviews_url"
          defaultValue={s.google_reviews_url}
          hint="Google Business review URL. Shows a 'Review us on Google' badge on the testimonials page + footer. Leave empty to hide."
        />
        <Field label="Consultation hours" name="consultation_hours" defaultValue={s.consultation_hours} />
        <Field
          label="Default video meeting link"
          name="default_meet_link"
          defaultValue={s.default_meet_link}
          hint="Reusable Google Meet room, attached automatically to online consults at confirmation when no per-appointment link exists. Patients only see a Join button from 10 minutes before until 30 minutes after their slot. Leave empty to paste a link per appointment instead."
        />
      </Section>

      <Section title="Clinic (shown when Clinic Mode is on)">
        <Field label="Clinic address" name="clinic_address" defaultValue={s.clinic_address} textarea />
        <Field
          label="Google Maps embed URL"
          name="maps_embed_url"
          defaultValue={s.maps_embed_url}
          hint="Use the keyless share-embed URL (maps.google.com/maps?...&output=embed) — no API key needed."
        />
      </Section>

      <Section title="Brand">
        <Field label="Brand name" name="brand_name" defaultValue={s.brand_name} hint="Shown in the site header (e.g. ARYA)." />
        <Field label="Brand tagline" name="brand_tagline" defaultValue={s.brand_tagline} hint="Small line under the brand name (e.g. Healing starts here)." />
      </Section>

      <Section title="Site content">
        <Field label="Notice banner" name="notice_banner" defaultValue={s.notice_banner} hint="Shown across the top of the site. Leave empty to hide." />
        <Field
          label="Homepage background photo"
          name="home_bg_image"
          defaultValue={s.home_bg_image}
          hint="Full-width photo behind the hero + About sections. Paste an image URL (or a /photos/… path). Leave the default for the clinic photo."
        />
        <Field label="SEO title" name="seo_title" defaultValue={s.seo_title} />
        <Field label="SEO description" name="seo_description" defaultValue={s.seo_description} textarea />
        <Field label="Medical disclaimer" name="medical_disclaimer" defaultValue={s.medical_disclaimer} textarea />
      </Section>

      <Section title="SMS gateway (Android — textbee.dev)">
        <p className="text-sm text-ink-soft">
          Gateway credentials live in environment variables
          (<code>TEXTBEE_API_KEY</code>, <code>TEXTBEE_DEVICE_ID</code>). The
          phone must stay on, charged and on network; if an SMS fails, email
          still delivers.
        </p>
        <TestSmsButton />
      </Section>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save settings"}
        </button>
        {state?.ok && <span className="text-sm text-sage-deep">✓ Saved</span>}
        {state?.error && <span className="text-sm text-terracotta-deep">{state.error}</span>}
      </div>
    </form>
  );
}
