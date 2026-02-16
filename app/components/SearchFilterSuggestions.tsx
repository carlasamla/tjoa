"use client";

import { useTranslations } from "next-intl";
import type { UserPreferences } from "@/app/lib/types";

interface SearchFilterSuggestionsProps {
  lastPreferences: UserPreferences | null;
  onBroadenBudget: () => void;
  onLowerQuality: () => void;
  onChangeSearch: () => void;
}

export function SearchFilterSuggestions({
  lastPreferences,
  onBroadenBudget,
  onLowerQuality,
  onChangeSearch,
}: SearchFilterSuggestionsProps) {
  const t = useTranslations("Suggestions");

  const showBudget =
    lastPreferences && lastPreferences.maxPrice < 1000000;
  const showQuality =
    lastPreferences && lastPreferences.qualityPriority > 25;

  return (
    <div
      className="mt-4 w-full max-w-sm"
      style={{ animation: "fade-in-up 400ms ease-out" }}
    >
      <p className="mb-3 text-center text-xs text-muted">{t("title")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {showBudget && (
          <button
            onClick={onBroadenBudget}
            className="rounded-full border border-border px-4 py-1.5 text-sm transition-all hover:border-foreground/40 hover:bg-foreground/5 active:scale-95"
          >
            {t("broadenBudget")}
          </button>
        )}
        {showQuality && (
          <button
            onClick={onLowerQuality}
            className="rounded-full border border-border px-4 py-1.5 text-sm transition-all hover:border-foreground/40 hover:bg-foreground/5 active:scale-95"
          >
            {t("lowerQuality")}
          </button>
        )}
        <button
          onClick={onChangeSearch}
          className="rounded-full border border-border px-4 py-1.5 text-sm transition-all hover:border-foreground/40 hover:bg-foreground/5 active:scale-95"
        >
          {t("changeSearch")}
        </button>
      </div>
    </div>
  );
}
