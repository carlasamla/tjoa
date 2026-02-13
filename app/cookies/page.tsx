"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

export default function CookiesPage() {
  const t = useTranslations("Cookies");

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/" className="text-sm text-muted hover:text-foreground transition-colors">
        &larr; tjoa
      </Link>

      <h1 className="mt-6 text-2xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("lastUpdated", { date: "2026-02-13" })}</p>

      <section className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/80">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("introTitle")}</h2>
          <p className="mt-2">{t("intro")}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("whatWeUseTitle")}</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>{t("themeCookie")}</li>
            <li>{t("localeCookie")}</li>
            <li>{t("affiliateCookie")}</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("thirdPartyTitle")}</h2>
          <p className="mt-2">{t("thirdPartyDesc")}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("controlTitle")}</h2>
          <p className="mt-2">{t("controlDesc")}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("contactTitle")}</h2>
          <p className="mt-2">{t("contactDesc", { email: "hello@tjoa.se" })}</p>
        </div>
      </section>
    </main>
  );
}
