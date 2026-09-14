import Link from "next/link";
import { getTranslations } from "next-intl/server";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata = { title: "Page not found" };

/** Custom 404. Lives at the app root (not inside the (site) group) so it also
 * catches unmatched /admin, /manage and /receipt paths; it pulls the public
 * chrome in directly rather than relying on the (site) layout. */
export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-cream">
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <p className="font-display text-7xl font-semibold text-terracotta">404</p>
          <h1 className="mt-4 font-display text-3xl font-semibold text-sage-deep">
            <span className="title-accent">{t("title")}</span>
          </h1>
          <p className="mt-4 text-ink-soft leading-relaxed">{t("body")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/book" className="btn-primary">
              {t("book")}
            </Link>
            <Link href="/" className="btn-ghost">
              {t("home")}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
