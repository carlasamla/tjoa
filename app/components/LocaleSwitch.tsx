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
      className={`fixed left-4 top-4 z-10 flex gap-1 text-sm ${isPending ? "opacity-50" : ""}`}
    >
      <button
        onClick={() => switchLocale("sv")}
        className={`rounded px-2 py-1 transition-colors ${
          locale === "sv"
            ? "font-semibold text-foreground"
            : "text-muted hover:text-foreground"
        }`}
      >
        SV
      </button>
      <span className="py-1 text-border">/</span>
      <button
        onClick={() => switchLocale("en")}
        className={`rounded px-2 py-1 transition-colors ${
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
