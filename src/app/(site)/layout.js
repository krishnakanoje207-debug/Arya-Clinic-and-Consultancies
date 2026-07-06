import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getSettings } from "@/lib/settings";

/** Chrome for all public marketing/booking pages. */
export default async function SiteLayout({ children }) {
  const s = await getSettings(["notice_banner"]).catch(() => ({}));
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
    </>
  );
}
