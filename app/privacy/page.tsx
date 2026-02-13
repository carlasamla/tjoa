"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

export default function PrivacyPage() {
  const t = useTranslations("Privacy");

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
          <h2 className="text-base font-semibold text-foreground">{t("collectTitle")}</h2>
          <p className="mt-2">{t("collectDesc")}</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>{t("collectSearch")}</li>
            <li>{t("collectPreferences")}</li>
            <li>{t("collectTechnical")}</li>
            <li>{t("collectCookies")}</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("useTitle")}</h2>
          <p className="mt-2">{t("useDesc")}</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>{t("useRecommendations")}</li>
            <li>{t("useImprove")}</li>
            <li>{t("useTechnical")}</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("affiliateTitle")}</h2>
          <p className="mt-2">{t("affiliateDesc")}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("aiTitle")}</h2>
          <p className="mt-2">{t("aiDesc")}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("rightsTitle")}</h2>
          <p className="mt-2">{t("rightsDesc")}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("contactTitle")}</h2>
          <p className="mt-2">{t("contactDesc", { email: "hello@tjoa.se" })}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("changesTitle")}</h2>
          <p className="mt-2">{t("changesDesc")}</p>
        </div>
      </section>
    </main>
  );
}
