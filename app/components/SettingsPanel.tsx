"use client";

import { useTranslations } from "next-intl";
import { Collapsible } from "@base-ui/react/collapsible";
import { Slider } from "@base-ui/react/slider";
import type { UserPreferences } from "@/app/lib/types";

// Non-linear price stops: small steps at low end, bigger steps toward 1M
const PRICE_STOPS = [
  0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000,
  6000, 7000, 8000, 9000, 10000,
  12000, 15000, 20000, 25000, 30000,
  40000, 50000, 75000, 100000,
  150000, 200000, 300000, 500000, 750000, 1000000,
];
const SLIDER_MAX = PRICE_STOPS.length - 1;

function priceToSlider(price: number): number {
  for (let i = PRICE_STOPS.length - 1; i >= 0; i--) {
    if (price >= PRICE_STOPS[i]) return i;
  }
  return 0;
}

function sliderToPrice(index: number): number {
  return PRICE_STOPS[Math.min(Math.max(0, Math.round(index)), SLIDER_MAX)];
}

interface SettingsPanelProps {
  preferences: UserPreferences;
  onPreferencesChange: (prefs: UserPreferences) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function formatPrice(value: number): string {
  if (value >= 1000000) return `${value / 1000000}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
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

  const minSlider = priceToSlider(preferences.minPrice);
  const maxSlider = priceToSlider(preferences.maxPrice);
  const minPercent = (minSlider / SLIDER_MAX) * 100;
  const maxPercent = (maxSlider / SLIDER_MAX) * 100;

  return (
    <Collapsible.Root open={isOpen} onOpenChange={onToggle} className="mt-4 w-full max-w-md">
      <Collapsible.Trigger
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
      </Collapsible.Trigger>

      <Collapsible.Panel className="overflow-hidden transition-all duration-300 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
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
                min={0}
                max={SLIDER_MAX}
                step={1}
                value={minSlider}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  const price = sliderToPrice(idx);
                  onPreferencesChange({
                    ...preferences,
                    minPrice: Math.min(price, preferences.maxPrice),
                  });
                }}
                className="dual-range-thumb pointer-events-none absolute top-0 h-full w-full appearance-none bg-transparent"
              />
              {/* Max thumb */}
              <input
                type="range"
                min={0}
                max={SLIDER_MAX}
                step={1}
                value={maxSlider}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  const price = sliderToPrice(idx);
                  onPreferencesChange({
                    ...preferences,
                    maxPrice: Math.max(price, preferences.minPrice),
                  });
                }}
                className="dual-range-thumb pointer-events-none absolute top-0 h-full w-full appearance-none bg-transparent"
              />
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>0 kr</span>
              <span>1M kr</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs text-muted">
              {t("qualityPriority")}{" "}
              <span className="font-medium text-foreground">
                {qualityLabel}
              </span>
            </label>
            <Slider.Root
              value={preferences.qualityPriority}
              onValueChange={(value) =>
                onPreferencesChange({
                  ...preferences,
                  qualityPriority: value as number,
                })
              }
              min={0}
              max={100}
              step={1}
              className="relative flex w-full touch-none items-center py-2"
            >
              <Slider.Control className="relative flex w-full items-center">
                <Slider.Track className="relative h-1 w-full rounded-full bg-foreground/20">
                  <Slider.Indicator className="absolute h-full rounded-full bg-foreground" />
                  <Slider.Thumb className="block h-4 w-4 rounded-full bg-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30" />
                </Slider.Track>
              </Slider.Control>
            </Slider.Root>
            <div className="flex justify-between text-xs text-muted">
              <span>{t("cheapest")}</span>
              <span>{t("balanced")}</span>
              <span>{t("bestQuality")}</span>
            </div>
          </div>
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
