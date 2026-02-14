"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LocaleSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(newLocale: string) {
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      className={`fixed left-3 top-3 z-10 flex gap-0.5 text-sm sm:left-4 sm:top-4 ${isPending ? "opacity-50" : ""}`}
    >
      <button
        onClick={() => switchLocale("sv")}
        className={`flex h-10 items-center rounded-full px-2.5 transition-colors active:bg-foreground/10 ${
          locale === "sv"
            ? "font-semibold text-foreground"
            : "text-muted hover:text-foreground"
        }`}
      >
        SV
      </button>
      <span className="flex items-center text-border">/</span>
      <button
        onClick={() => switchLocale("en")}
        className={`flex h-10 items-center rounded-full px-2.5 transition-colors active:bg-foreground/10 ${
          locale === "en"
            ? "font-semibold text-foreground"
            : "text-muted hover:text-foreground"
        }`}
      >
        EN
      </button>
    </div>
  );
}
