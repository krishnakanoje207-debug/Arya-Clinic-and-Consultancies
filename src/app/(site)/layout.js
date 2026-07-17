import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import StickyContact from "@/components/StickyContact";
import { getSettings } from "@/lib/settings";

/** Chrome for all public marketing/booking pages. */
export default async function SiteLayout({ children }) {
  const s = await getSettings([
    "notice_banner",
    "contact_phone",
    "contact_whatsapp",
  ]).catch(() => ({}));
  return (
    <>
      {s.notice_banner ? (
        <div className="bg-terracotta text-white text-center text-sm py-2 px-4">
          {s.notice_banner}
        </div>
      ) : null}
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      {/* Spacer so the mobile sticky bar never covers footer content. */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <StickyContact phone={s.contact_phone} whatsapp={s.contact_whatsapp} />
    </>
  );
}
