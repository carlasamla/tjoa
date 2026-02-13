import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const locales = ["sv", "en"] as const;
type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const stored = cookieStore.get("locale")?.value;
  const locale: Locale =
    stored && locales.includes(stored as Locale)
      ? (stored as Locale)
      : "sv";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
