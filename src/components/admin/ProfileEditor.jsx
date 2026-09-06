"use client";

import { useActionState } from "react";
import { saveProfile } from "@/app/admin/actions/content";
import ImageUpload from "@/components/admin/ImageUpload";

export default function ProfileEditor({ profile }) {
  const [state, action, pending] = useActionState(saveProfile, null);
  const p = profile || {};
  const degreesText = (p.degrees || [])
    .map((d) => [d.title, d.institution, d.year].filter(Boolean).join(" | "))
    .join("\n");
  const statsText = (p.stats || [])
    .map((s) => [s.label, s.value].filter(Boolean).join(" | "))
    .join("\n");
  const membershipsText = (p.memberships || []).join("\n");
  const badgesText = (p.badges || [])
    .map((b) => [b.label, b.label_hi].filter(Boolean).join(" | "))
    .join("\n");

  const input = "w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm";

  return (
    <form action={action} className="card-warm p-6 grid gap-3 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="block text-sm font-semibold mb-1">Name</span>
        <input name="name" defaultValue={p.name || ""} className={input} />
      </label>
      <label className="block">
        <span className="block text-sm font-semibold mb-1">Tagline</span>
        <input name="tagline" defaultValue={p.tagline || ""} className={input} />
      </label>
      <label className="block">
        <span className="block text-sm font-semibold mb-1">Tagline (Hindi)</span>
        <input name="taglineHi" defaultValue={p.taglineHi || ""} className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="block text-sm font-semibold mb-1">Bio</span>
        <textarea name="bio" defaultValue={p.bio || ""} rows={4} className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="block text-sm font-semibold mb-1">Bio (Hindi)</span>
        <textarea name="bioHi" defaultValue={p.bioHi || ""} rows={4} className={input} />
      </label>
      <label className="block">
        <span className="block text-sm font-semibold mb-1">Years of experience</span>
        <input name="yearsExperience" type="number" defaultValue={p.yearsExperience ?? ""} className={input} />
      </label>
      <label className="block">
        <span className="block text-sm font-semibold mb-1">Registration number</span>
        <input name="registrationNumber" defaultValue={p.registrationNumber || ""} className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="block text-sm font-semibold mb-1">Registration council</span>
        <input name="registrationCouncil" defaultValue={p.registrationCouncil || ""} className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="block text-sm font-semibold mb-1">
          Memberships — one per line
        </span>
        <textarea name="memberships" defaultValue={membershipsText} rows={2} className={input} />
      </label>
      <ImageUpload name="heroImage" label="Hero image" defaultValue={p.heroImage} />
      <ImageUpload name="aboutImage" label="About image" defaultValue={p.aboutImage} />
      <label className="block sm:col-span-2">
        <span className="block text-sm font-semibold mb-1">
          Degrees — one per line: <code>Title | Institution | Year</code>
        </span>
        <textarea name="degrees" defaultValue={degreesText} rows={3} className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="block text-sm font-semibold mb-1">
          Badges — the pills beside your name in the hero. One per line:{" "}
          <code>Label | Hindi label</code> (Hindi optional)
        </span>
        <textarea name="badges" defaultValue={badgesText} rows={3} className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="block text-sm font-semibold mb-1">
          Stats — one per line: <code>Label | Value</code>
        </span>
        <textarea name="stats" defaultValue={statsText} rows={2} className={input} />
      </label>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save profile"}
        </button>
        {state?.ok && <span className="text-sm text-sage-deep">✓ Saved</span>}
      </div>
    </form>
  );
}
