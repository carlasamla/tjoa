"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

export default function TermsPage() {
  const t = useTranslations("Terms");

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
          <h2 className="text-base font-semibold text-foreground">{t("serviceTitle")}</h2>
          <p className="mt-2">{t("serviceDesc")}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("disclaimerTitle")}</h2>
          <p className="mt-2">{t("disclaimerInvestment")}</p>
          <p className="mt-2">{t("disclaimerProduct")}</p>
          <p className="mt-2">{t("disclaimerGeneral")}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("affiliateTitle")}</h2>
          <p className="mt-2">{t("affiliateDesc")}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("liabilityTitle")}</h2>
          <p className="mt-2">{t("liabilityDesc")}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("ipTitle")}</h2>
          <p className="mt-2">{t("ipDesc")}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("changesTitle")}</h2>
          <p className="mt-2">{t("changesDesc")}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("contactTitle")}</h2>
          <p className="mt-2">{t("contactDesc", { email: "hello@tjoa.se" })}</p>
        </div>
      </section>
    </main>
  );
}
