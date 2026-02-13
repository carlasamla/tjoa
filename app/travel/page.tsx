"use client";

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { TravelPreferences, TravelRecommendation, TravelResponse } from "@/app/lib/types";
import { SearchForm } from "@/app/components/SearchForm";
import { TravelCard } from "@/app/components/TravelCard";
import { TravelSettingsPanel } from "@/app/components/TravelSettingsPanel";
import { LoadingAnimation } from "@/app/components/LoadingAnimation";
import { LocaleSwitch } from "@/app/components/LocaleSwitch";
import { NavMenu } from "@/app/components/NavMenu";

export default function TravelPage() {
  const t = useTranslations("TravelPage");
  const locale = useLocale();

  const [query, setQuery] = useState("");
  const [preferences, setPreferences] = useState<TravelPreferences>({
    budget: 15000,
    comfort: 50,
  });
  const [result, setResult] = useState<TravelRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, preferences, locale }),
      });
      const data: TravelResponse = await res.json();

      if (data.success && data.recommendation) {
        setResult(data.recommendation);
      } else {
        setError(data.error || t("error"));
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setIsLoading(false);
    }
  }, [query, preferences, locale, t]);

  const toggleSettings = useCallback(() => {
    setSettingsOpen((prev) => !prev);
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <LocaleSwitch />

      <NavMenu />

      <h1 className="mb-4 text-center text-2xl font-semibold tracking-tight">
        {t("title")}
      </h1>

      <SearchForm
        query={query}
        onQueryChange={setQuery}
        onSubmit={handleSearch}
        isLoading={isLoading}
        placeholderKey="TravelSearch"
        buttonKey="TravelSearch"
      />

      <TravelSettingsPanel
        preferences={preferences}
        onPreferencesChange={setPreferences}
        isOpen={settingsOpen}
        onToggle={toggleSettings}
      />

      {isLoading && <LoadingAnimation loadingKey="TravelLoading" />}

      {result && !isLoading && <TravelCard recommendation={result} />}

      {error && !isLoading && (
        <p className="mt-8 text-center text-muted">{error}</p>
      )}
    </main>
  );
}
