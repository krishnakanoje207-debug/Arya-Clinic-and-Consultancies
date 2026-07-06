import { getTranslations } from "next-intl/server";
import { localized } from "@/lib/content";
import SafeImage from "@/components/SafeImage";

export default async function About({ profile, locale }) {
  const t = await getTranslations("sections");
  const bio = localized(profile, "bio", locale);
  const degrees = Array.isArray(profile?.degrees) ? profile.degrees : [];

  return (
    <section id="about" className="bg-cream scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 py-14">
      <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8">
        <span className="title-accent">{t("aboutTitle")}</span>
      </h2>
      <div className="card-warm p-8 grid md:grid-cols-[260px_1fr] gap-8 items-start">
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
          {degrees.length ? (
            <ul className="mt-6 space-y-1 text-sm text-ink">
              {degrees.map((d, i) => (
                <li key={i}>
                  <span className="font-semibold">{d.title}</span>
                  {d.institution ? ` — ${d.institution}` : ""}
                  {d.year ? ` (${d.year})` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          {profile?.registrationNumber ? (
            <p className="mt-4 text-xs text-ink-soft">
              Reg. No. {profile.registrationNumber}
              {profile.registrationCouncil ? ` · ${profile.registrationCouncil}` : ""}
            </p>
          ) : null}
        </div>
      </div>
      </div>
    </section>
  );
}
