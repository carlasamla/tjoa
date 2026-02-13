"use client";

import { useTranslations } from "next-intl";
import type { TravelPreferences } from "@/app/lib/types";

interface TravelSettingsPanelProps {
  preferences: TravelPreferences;
  onPreferencesChange: (prefs: TravelPreferences) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function TravelSettingsPanel({
  preferences,
  onPreferencesChange,
  isOpen,
  onToggle,
}: TravelSettingsPanelProps) {
  const t = useTranslations("TravelSettings");

  const comfortLabel =
    preferences.comfort <= 25
      ? t("cheapest")
      : preferences.comfort <= 75
        ? t("balanced")
        : t("premium");

  return (
    <div className="mt-2 w-full max-w-sm">
      <button
        onClick={onToggle}
        className="mx-auto flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        {t("title")}
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
                {t("budget")}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">kr</span>
                <input
                  type="number"
                  value={preferences.budget}
                  onChange={(e) =>
                    onPreferencesChange({
                      ...preferences,
                      budget: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full rounded-lg border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
                  min={0}
                  placeholder="15000"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs text-muted">
                {t("comfort")}{" "}
                <span className="font-medium text-foreground">
                  {comfortLabel}
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={preferences.comfort}
                onChange={(e) =>
                  onPreferencesChange({
                    ...preferences,
                    comfort: Number(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted">
                <span>{t("cheapest")}</span>
                <span>{t("balanced")}</span>
                <span>{t("premium")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
