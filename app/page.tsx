"use client";

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import type {
  UserPreferences,
  ProductRecommendation,
  RecommendResponse,
} from "@/app/lib/types";
import { SearchForm } from "@/app/components/SearchForm";
import { ProductCard } from "@/app/components/ProductCard";
import { SettingsPanel } from "@/app/components/SettingsPanel";
import { LoadingAnimation } from "@/app/components/LoadingAnimation";

import { NavMenu } from "@/app/components/NavMenu";
import { Logo } from "@/app/components/Logo";
import { ThemeToggle } from "@/app/components/ThemeToggle";

export default function Home() {
  const t = useTranslations("Page");
  const locale = useLocale();

  const [query, setQuery] = useState("");
  const [preferences, setPreferences] = useState<UserPreferences>({
    minPrice: 0,
    maxPrice: 20000,
    qualityPriority: 50,
  });
  const [result, setResult] = useState<ProductRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, preferences, locale }),
      });
      const data: RecommendResponse = await res.json();

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
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-[20vh]">
      <ThemeToggle />

      <NavMenu />

      <p className="mb-2 text-center text-lg text-muted">
        {t("title")}
      </p>

      <SearchForm
        query={query}
        onQueryChange={setQuery}
        onSubmit={handleSearch}
        isLoading={isLoading}
      />

      <SettingsPanel
        preferences={preferences}
        onPreferencesChange={setPreferences}
        isOpen={settingsOpen}
        onToggle={toggleSettings}
      />

      {isLoading && <LoadingAnimation />}

      {result && !isLoading && <ProductCard recommendation={result} />}

      {error && !isLoading && (
        <p className="mt-8 text-center text-muted">{error}</p>
      )}

      <div className="fixed right-6 bottom-6">
        <Logo size="small" />
      </div>
    </main>
  );
}
