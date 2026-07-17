import { getTranslations } from "next-intl/server";
import { localized } from "@/lib/content";
import SafeImage from "@/components/SafeImage";

export default async function About({ profile, locale }) {
  const t = await getTranslations("sections");
  const c = await getTranslations("credentials");
  const bio = localized(profile, "bio", locale);
  const degrees = Array.isArray(profile?.degrees) ? profile.degrees : [];
  const memberships = Array.isArray(profile?.memberships)
    ? profile.memberships.filter(Boolean)
    : [];
  const years = profile?.yearsExperience;
  const regNo = profile?.registrationNumber;
  const council = profile?.registrationCouncil;

  return (
    <section id="about" className="relative scroll-mt-28">
      <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
      <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8 drop-shadow-sm">
        <span className="title-accent">{t("aboutTitle")}</span>
      </h2>
      {/* Semi-opaque card floating over the fixed background photo. */}
      <div
        className="card-warm p-8 grid md:grid-cols-[260px_1fr] gap-8 items-start backdrop-blur-sm"
        style={{ background: "rgba(255,255,255,0.92)" }}
      >
        <div className="aspect-square rounded-2xl overflow-hidden bg-sage-soft">
          {profile?.aboutImage ? (
            <SafeImage
              src={profile.aboutImage}
              alt={profile?.name || "Dr. Seema"}
              width={440}
              height={440}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-sage-deep/50 text-sm">
              About photo
            </div>
          )}
        </div>
        <div>
          <p className="text-ink-soft leading-relaxed whitespace-pre-line">
            {bio || "Bio coming soon."}
          </p>

          {/* Credential block — definition list styled as warm rows. Each
              row only renders when its data is set (client fills reg. no.
              and memberships later). */}
          <dl className="mt-6 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-cream/60 overflow-hidden text-sm">
            {degrees.length ? (
              <div className="grid sm:grid-cols-[160px_1fr] gap-1 sm:gap-4 px-4 py-3">
                <dt className="font-semibold text-sage-deep">
                  {c("qualifications")}
                </dt>
                <dd className="text-ink">
                  <ul className="space-y-1">
                    {degrees.map((d, i) => (
                      <li key={i}>
                        <span className="font-semibold">{d.title}</span>
                        {d.institution ? ` — ${d.institution}` : ""}
                        {d.year ? ` (${d.year})` : ""}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}

            {years ? (
              <div className="grid sm:grid-cols-[160px_1fr] gap-1 sm:gap-4 px-4 py-3">
                <dt className="font-semibold text-sage-deep">
                  {c("experience")}
                </dt>
                <dd className="text-ink">
                  {years}+ {c("years")}
                </dd>
              </div>
            ) : null}

            {regNo ? (
              <div className="grid sm:grid-cols-[160px_1fr] gap-1 sm:gap-4 px-4 py-3">
                <dt className="font-semibold text-sage-deep">
                  {c("registration")}
                </dt>
                <dd className="text-ink">
                  {regNo}
                  {council ? ` · ${council}` : ""}
                </dd>
              </div>
            ) : null}

            {memberships.length ? (
              <div className="grid sm:grid-cols-[160px_1fr] gap-1 sm:gap-4 px-4 py-3">
                <dt className="font-semibold text-sage-deep">
                  {c("memberships")}
                </dt>
                <dd className="text-ink">
                  <ul className="space-y-1">
                    {memberships.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
      </div>
    </section>
  );
}
