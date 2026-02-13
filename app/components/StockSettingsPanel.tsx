"use client";

import { useTranslations } from "next-intl";
import type { StockPreferences } from "@/app/lib/types";

interface StockSettingsPanelProps {
  preferences: StockPreferences;
  onPreferencesChange: (prefs: StockPreferences) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function StockSettingsPanel({
  preferences,
  onPreferencesChange,
  isOpen,
  onToggle,
}: StockSettingsPanelProps) {
  const t = useTranslations("StockSettings");

  const riskLabel =
    preferences.risk <= 25
      ? t("lowRisk")
      : preferences.risk <= 75
        ? t("mediumRisk")
        : t("highRisk");

  const rewardLabel =
    preferences.reward <= 25
      ? t("lowReward")
      : preferences.reward <= 75
        ? t("mediumReward")
        : t("highReward");

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
                {t("risk")}{" "}
                <span className="font-medium text-foreground">
                  {riskLabel}
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={preferences.risk}
                onChange={(e) =>
                  onPreferencesChange({
                    ...preferences,
                    risk: Number(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted">
                <span>{t("lowRisk")}</span>
                <span>{t("mediumRisk")}</span>
                <span>{t("highRisk")}</span>
              </div>
            </div>

            <div className="mb-3">
              <label className="mb-2 block text-xs text-muted">
                {t("reward")}{" "}
                <span className="font-medium text-foreground">
                  {rewardLabel}
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={preferences.reward}
                onChange={(e) =>
                  onPreferencesChange({
                    ...preferences,
                    reward: Number(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted">
                <span>{t("lowReward")}</span>
                <span>{t("mediumReward")}</span>
                <span>{t("highReward")}</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs text-muted">
                {t("maxPrice")}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">kr</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
