import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const LOCALES = ["en", "hi"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * Cookie-based locale (no URL prefixes) — keeps /admin and booking routes
 * clean while still giving a real English/Hindi UI toggle. The toggle is a
 * server action that sets NEXT_LOCALE (see src/app/actions/locale.js).
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale = LOCALES.includes(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
