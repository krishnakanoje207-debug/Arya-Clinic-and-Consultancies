import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getSettings } from "@/lib/settings";
import { getPublishedConditions, localized } from "@/lib/content";
import { CATEGORY_ORDER, conditionCategory } from "@/lib/conditions-data";
import LanguageToggle from "@/components/LanguageToggle";
import DesktopNav from "@/components/DesktopNav";
import MobileNav from "@/components/MobileNav";

/**
 * Two-tier public header (v2.1 reference alignment; ARYA theme unchanged):
 *  - top utility bar (lg+ only): quiet section links + language toggle + phone.
 *  - main bar: brand · mega-menu nav (DesktopNav, client) · Book + Call CTAs.
 * Mobile keeps the hamburger (MobileNav). All data is fetched here (server) and
 * passed to DesktopNav as serializable props — never functions.
 */
export default async function SiteHeader() {
  const [t, tm, locale] = await Promise.all([
    getTranslations("nav"),
    getTranslations("mega"),
    getLocale(),
  ]);
  const s = await getSettings([
    "brand_name",
    "brand_tagline",
    "contact_phone",
  ]).catch(() => ({ brand_name: "ARYA", brand_tagline: "", contact_phone: "" }));
  const conditions = await getPublishedConditions();

  const tel = s.contact_phone
    ? `tel:${String(s.contact_phone).replace(/\s/g, "")}`
    : null;

  // "Conditions We Treat" mega menu — columns grouped by category from the
  // published conditions (DB rows or code fallback), ordered by CATEGORY_ORDER.
  const byCat = {};
  for (const c of conditions) {
    const cat = conditionCategory(c.slug);
    (byCat[cat] ||= []).push({
      label: localized(c, "name", locale),
      href: `/conditions/${c.slug}`,
    });
  }
  const conditionColumns = CATEGORY_ORDER.filter((cat) => byCat[cat]?.length).map(
    (cat) => ({ heading: tm(`cat.${cat}`), links: byCat[cat] }),
  );

  const menus = [
    {
      id: "conditions",
      label: tm("conditionsTitle"),
      columns: conditionColumns,
      footer: { label: tm("viewAllConditions"), href: "/#conditions" },
    },
    {
      id: "arya-way",
      label: tm("aryaWayTitle"),
      columns: [
        {
          heading: tm("howWeTreat"),
          links: [
            { label: tm("yourPath"), href: "/#healing" },
            { label: tm("whyArya"), href: "/#why" },
            { label: tm("servicesFees"), href: "/#services" },
          ],
        },
        {
          heading: tm("theDoctor"),
          links: [
            { label: tm("aboutDoctor"), href: "/#about" },
            { label: tm("credentials"), href: "/#about" },
            { label: tm("faqs"), href: "/#faq" },
          ],
        },
      ],
    },
  ];

  const plainLinks = [
    { label: tm("selfCheck"), href: "/quiz/womens-health" },
    { label: t("testimonials"), href: "/testimonials" },
    { label: t("successStories"), href: "/#stories" },
  ];

  const topLinks = [
    { label: t("successStories"), href: "/#stories" },
    { label: t("research"), href: "/#research" },
    { label: t("faqs"), href: "/#faq" },
    { label: t("contact"), href: "/#contact" },
  ];

  // Condition links flattened for the mobile hamburger group.
  const mobileConditionLinks = conditions.map((c) => [
    `/conditions/${c.slug}`,
    localized(c, "name", locale),
  ]);
  const mobileLinks = [
    ["/#about", t("about")],
    ["/#services", t("services")],
    ["/#stories", t("successStories")],
    ["/testimonials", t("testimonials")],
    ["/quiz/womens-health", tm("selfCheck")],
    ["/#faq", t("faq")],
    ["/#contact", t("contact")],
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-cream/90 border-b border-[var(--border)]">
      {/* Top utility bar — quiet, lg+ only */}
      <div className="hidden lg:block border-b border-[var(--border)]/70">
        <div className="mx-auto max-w-7xl px-4 h-9 flex items-center justify-between text-xs text-ink-soft">
          <nav className="flex items-center gap-5">
            {topLinks.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-sage-deep">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            {s.contact_phone ? (
              <a href={tel} className="font-semibold text-sage-deep hover:text-terracotta">
                {s.contact_phone}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
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

        <DesktopNav menus={menus} links={plainLinks} />

        <div className="flex items-center gap-3">
          {tel ? (
            <a
              href={tel}
              className="hidden lg:inline-block btn-ghost text-sm !py-2 !px-4"
            >
              {t("callNow")}
            </a>
          ) : null}
          <Link href="/book" className="hidden sm:inline-block btn-primary text-sm">
            {t("book")}
          </Link>
          <MobileNav
            links={mobileLinks}
            conditionLinks={mobileConditionLinks}
            conditionsLabel={tm("conditionsTitle")}
            bookLabel={t("book")}
            menuLabel={t("home")}
          />
        </div>
      </div>
    </header>
  );
}
