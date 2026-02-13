"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "./Logo";

export function Footer() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border mt-auto py-4 px-4">
      <div className="mx-auto max-w-2xl flex flex-col items-center gap-2 text-xs text-muted">
        <Logo size="small" />

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            {t("privacy")}
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            {t("terms")}
          </Link>
          <Link href="/cookies" className="hover:text-foreground transition-colors">
            {t("cookies")}
          </Link>
          <span className="text-muted/50">&copy; {year} tjoa</span>
        </div>

        <p className="text-center text-[11px] text-muted/50">
          {t("affiliateNotice")}
        </p>
      </div>
    </footer>
  );
}
