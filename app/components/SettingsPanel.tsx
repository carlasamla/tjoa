"use client";

import { useTranslations } from "next-intl";
import type { UserPreferences } from "@/app/lib/types";

interface SettingsPanelProps {
  preferences: UserPreferences;
  onPreferencesChange: (prefs: UserPreferences) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function SettingsPanel({
  preferences,
  onPreferencesChange,
  isOpen,
  onToggle,
}: SettingsPanelProps) {
  const t = useTranslations("Settings");

  const qualityLabel =
    preferences.qualityPriority <= 25
      ? t("cheapest")
      : preferences.qualityPriority <= 75
        ? t("balanced")
        : t("bestQuality");

  return (
    <div className="mt-4 w-full max-w-md">
      <button
        onClick={onToggle}
        className="mx-auto flex items-center text-muted transition-colors hover:text-foreground"
        aria-label={t("title")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="8" cy="6" r="2" fill="currentColor" />
          <circle cx="16" cy="12" r="2" fill="currentColor" />
          <circle cx="10" cy="18" r="2" fill="currentColor" />
        </svg>
      </button>

      <div
        className="grid transition-all duration-300 ease-out"
        style={{
          gridTemplateRows: isOpen ? "1fr" : "0fr",
        }}
      >
        <div className="overflow-hidden">
          <div className="pt-2 pb-1">
            <div className="mb-3">
              <label className="mb-2 block text-xs text-muted">
                {t("priceRange")}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">kr</span>
                <input
                  type="number"
                  value={preferences.minPrice}
                  onChange={(e) =>
                    onPreferencesChange({
                      ...preferences,
                      minPrice: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full rounded-lg border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
                  min={0}
                  placeholder="0"
                />
                <span className="text-xs text-muted">–</span>
                <input
                  type="number"
                  value={preferences.maxPrice}
                  onChange={(e) =>
                    onPreferencesChange({
                      ...preferences,
                      maxPrice: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full rounded-lg border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
                  min={0}
                  placeholder="5000"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs text-muted">
                {t("qualityPriority")}{" "}
                <span className="font-medium text-foreground">
                  {qualityLabel}
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={preferences.qualityPriority}
                onChange={(e) =>
                  onPreferencesChange({
                    ...preferences,
                    qualityPriority: Number(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted">
                <span>{t("cheapest")}</span>
                <span>{t("balanced")}</span>
                <span>{t("bestQuality")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
