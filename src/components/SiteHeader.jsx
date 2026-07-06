import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSettings } from "@/lib/settings";
import LanguageToggle from "@/components/LanguageToggle";
import MobileNav from "@/components/MobileNav";

/** Public top navigation. Contact info lives in the footer; the header
 * keeps section anchors + a prominent Book CTA on every page. */
export default async function SiteHeader() {
  const t = await getTranslations("nav");
  const s = await getSettings(["brand_name", "brand_tagline"]).catch(() => ({
    brand_name: "ARYA",
    brand_tagline: "",
  }));

  const links = [
    ["/#about", t("about")],
    ["/#services", t("services")],
    ["/#stories", t("successStories")],
    ["/#faq", t("faq")],
    ["/#contact", t("contact")],
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-cream/85 border-b border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/arya-logo.png"
            alt=""
            className="h-10 w-10 rounded-full object-cover ring-1 ring-[var(--border)]"
          />
          <span className="leading-tight">
            <span className="block font-display text-xl text-sage-deep font-semibold">
              {s.brand_name || "ARYA"}
            </span>
            {s.brand_tagline ? (
              <span className="block text-[11px] text-ink-soft -mt-0.5">
                {s.brand_tagline}
              </span>
            ) : null}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-ink-soft">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-sage-deep">
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link href="/book" className="hidden sm:inline-block btn-primary text-sm">
            {t("book")}
          </Link>
          <MobileNav links={links} bookLabel={t("book")} menuLabel={t("home")} />
        </div>
      </div>
    </header>
  );
}
