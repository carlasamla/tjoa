"use client";

import { useTranslations } from "next-intl";
import type { UserPreferences } from "@/app/lib/types";

const PRICE_MIN = 0;
const PRICE_MAX = 20000;
const PRICE_STEP = 500;

interface SettingsPanelProps {
  preferences: UserPreferences;
  onPreferencesChange: (prefs: UserPreferences) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function formatPrice(value: number): string {
  return value >= 1000
    ? `${Math.round(value / 1000)}k`
    : String(value);
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

  const minPercent = ((preferences.minPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const maxPercent = ((preferences.maxPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

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
                {t("priceRange")}{" "}
                <span className="font-medium text-foreground">
                  {formatPrice(preferences.minPrice)} – {formatPrice(preferences.maxPrice)} kr
                </span>
              </label>
              <div className="relative h-6">
                {/* Track background */}
                <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-foreground/20" />
                {/* Active range highlight */}
                <div
                  className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-foreground"
                  style={{
                    left: `${minPercent}%`,
                    width: `${maxPercent - minPercent}%`,
                  }}
                />
                {/* Min thumb */}
                <input
                  type="range"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={PRICE_STEP}
                  value={preferences.minPrice}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onPreferencesChange({
                      ...preferences,
                      minPrice: Math.min(val, preferences.maxPrice - PRICE_STEP),
                    });
                  }}
                  className="dual-range-thumb pointer-events-none absolute top-0 h-full w-full appearance-none bg-transparent"
                />
                {/* Max thumb */}
                <input
                  type="range"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={PRICE_STEP}
                  value={preferences.maxPrice}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onPreferencesChange({
                      ...preferences,
                      maxPrice: Math.max(val, preferences.minPrice + PRICE_STEP),
                    });
                  }}
                  className="dual-range-thumb pointer-events-none absolute top-0 h-full w-full appearance-none bg-transparent"
                />
              </div>
              <div className="flex justify-between text-xs text-muted">
                <span>{formatPrice(PRICE_MIN)} kr</span>
                <span>{formatPrice(PRICE_MAX)} kr</span>
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
