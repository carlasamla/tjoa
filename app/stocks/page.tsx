"use client";

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { StockPreferences, StockRecommendation, StockResponse } from "@/app/lib/types";
import { SearchForm } from "@/app/components/SearchForm";
import { StockCard } from "@/app/components/StockCard";
import { StockSettingsPanel } from "@/app/components/StockSettingsPanel";
import { LoadingAnimation } from "@/app/components/LoadingAnimation";

import { NavMenu } from "@/app/components/NavMenu";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Footer } from "@/app/components/Footer";

export default function StocksPage() {
  const t = useTranslations("StocksPage");
  const locale = useLocale();

  const [query, setQuery] = useState("");
  const [preferences, setPreferences] = useState<StockPreferences>({
    risk: 50,
    reward: 50,
    maxPrice: 5000,
  });
  const [result, setResult] = useState<StockRecommendation | null>(null);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setSearchId(null);

    try {
      const res = await fetch("/api/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, preferences, locale }),
      });
      const data: StockResponse = await res.json();

      if (data.success && data.recommendation) {
        setResult(data.recommendation);
        setSearchId(data.searchId || null);
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
    <div className="flex min-h-screen flex-col">
      <main className="relative flex flex-1 flex-col items-center px-4">
        <ThemeToggle />

        <div className="my-auto flex w-full flex-col items-center py-14 sm:py-8">
          <NavMenu />

          <p className="mb-2 text-center text-base text-muted sm:text-lg">
            {t("title")}
          </p>

          <SearchForm
            query={query}
            onQueryChange={setQuery}
            onSubmit={handleSearch}
            isLoading={isLoading}
            placeholderKey="StocksSearch"
            buttonKey="StocksSearch"
          />

          <StockSettingsPanel
            preferences={preferences}
            onPreferencesChange={setPreferences}
            isOpen={settingsOpen}
            onToggle={toggleSettings}
          />

          {isLoading && <LoadingAnimation loadingKey="StockLoading" />}

          {result && !isLoading && <StockCard recommendation={result} searchId={searchId ?? undefined} />}

          {error && !isLoading && (
            <p className="mt-8 text-center text-muted">{error}</p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
