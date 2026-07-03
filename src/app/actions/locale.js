"use server";

import { cookies } from "next/headers";
import { LOCALES, LOCALE_COOKIE } from "@/i18n/request";

/** Toggle/select UI language. Persists a year-long cookie; next-intl reads
 * it on the next request. */
export async function setLocale(locale) {
  const value = LOCALES.includes(locale) ? locale : "en";
  const store = await cookies();
  store.set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
