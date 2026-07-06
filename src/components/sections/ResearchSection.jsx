import { getTranslations } from "next-intl/server";
import { localized } from "@/lib/content";

const TYPE_LABEL = {
  paper: "Paper",
  article: "Article",
  video: "Video",
  pdf: "PDF",
};

/** Rendered only when the admin has published the section AND ≥1 visible
 * item exists — the caller passes an empty list otherwise (plan §3.3).
 * Card grid follows reference-3. */
export default async function ResearchSection({ items, locale }) {
  const t = await getTranslations("sections");
  if (!items?.length) return null;

  return (
    <section id="research" className="bg-cream scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 py-14">
      <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8">
        <span className="title-accent">{t("researchTitle")}</span>
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((it) => (
          <a
            key={it.id}
            href={it.linkOrFile}
            target="_blank"
            rel="noreferrer"
            className="card-warm card-lift overflow-hidden group"
          >
            <div className="aspect-video bg-sage-soft overflow-hidden">
              {it.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.coverImage}
                  alt=""
                  className="h-full w-full object-cover group-hover:scale-105 transition"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sage-deep/50 text-sm">
                  {TYPE_LABEL[it.type]}
                </div>
              )}
            </div>
            <div className="p-5">
              <span className="text-xs uppercase tracking-wide text-sage-deep">
                {TYPE_LABEL[it.type]}
              </span>
              <h3 className="mt-1 font-semibold text-ink group-hover:text-sage-deep">
                {localized(it, "title", locale)}
              </h3>
              <p className="mt-2 text-sm text-ink-soft line-clamp-3">
                {localized(it, "summary", locale)}
              </p>
            </div>
          </a>
        ))}
      </div>
      </div>
    </section>
  );
}
