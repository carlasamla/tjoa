"use client";

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import type {
  UserPreferences,
  ProductRecommendation,
  RecommendResponse,
  GuideQuestion,
  GuideAnswer,
  GuideResponse,
} from "@/app/lib/types";
import { SearchForm } from "@/app/components/SearchForm";
import { ProductCard } from "@/app/components/ProductCard";
import { SettingsPanel } from "@/app/components/SettingsPanel";
import { LoadingAnimation } from "@/app/components/LoadingAnimation";
import { GuideQuestions } from "@/app/components/GuideQuestions";

import { NavMenu } from "@/app/components/NavMenu";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Footer } from "@/app/components/Footer";

type Phase = "idle" | "guide-loading" | "guide" | "searching";

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
  const [searchId, setSearchId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideQuestions, setGuideQuestions] = useState<GuideQuestion[] | null>(null);

  const doSearch = useCallback(
    async (guideAnswers?: GuideAnswer[]) => {
      setPhase("searching");
      setError(null);
      setResult(null);
      setSearchId(null);
      setGuideQuestions(null);

      try {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, preferences, locale, guideAnswers }),
        });
        const data: RecommendResponse = await res.json();

        if (data.success && data.recommendation) {
          setResult(data.recommendation);
          setSearchId(data.searchId || null);
        } else {
          setError(data.error || t("error"));
        }
      } catch {
        setError(t("genericError"));
      } finally {
        setPhase("idle");
      }
    },
    [query, preferences, locale, t],
  );

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    doSearch();
  }, [query, doSearch]);

  const handleGuide = useCallback(async () => {
    if (!query.trim()) return;

    setPhase("guide-loading");
    setError(null);
    setResult(null);
    setSearchId(null);
    setGuideQuestions(null);

    try {
      const res = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, locale }),
      });
      const data: GuideResponse = await res.json();

      if (data.success && data.questions && data.questions.length > 0) {
        setGuideQuestions(data.questions);
        setPhase("guide");
        return;
      }
    } catch {
      // Guide failed — fall through to direct search
    }

    // If guide fails or returns nothing, search directly
    doSearch();
  }, [query, locale, doSearch]);

  const handleGuideSubmit = useCallback(
    (answers: GuideAnswer[]) => {
      doSearch(answers);
    },
    [doSearch],
  );

  const handleGuideSkip = useCallback(() => {
    doSearch();
  }, [doSearch]);

  const toggleSettings = useCallback(() => {
    setSettingsOpen((prev) => !prev);
  }, []);

  const isLoading = phase === "guide-loading" || phase === "searching";

  return (
    <div className="flex min-h-screen flex-col">
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <ThemeToggle />

        <NavMenu />

        <p className="mb-2 text-center text-lg text-muted">
          {t("title")}
        </p>

        <SearchForm
          query={query}
          onQueryChange={setQuery}
          onSubmit={handleSearch}
          onGuide={handleGuide}
          isLoading={isLoading}
        />

        <SettingsPanel
          preferences={preferences}
          onPreferencesChange={setPreferences}
          isOpen={settingsOpen}
          onToggle={toggleSettings}
        />

        {phase === "guide-loading" && (
          <LoadingAnimation loadingKey="GuideLoading" />
        )}

        {phase === "guide" && guideQuestions && (
          <GuideQuestions
            questions={guideQuestions}
            onSubmit={handleGuideSubmit}
            onSkip={handleGuideSkip}
            isLoading={false}
          />
        )}

        {phase === "searching" && <LoadingAnimation />}

        {result && phase === "idle" && (
          <ProductCard recommendation={result} searchId={searchId ?? undefined} />
        )}

        {error && phase === "idle" && (
          <p className="mt-8 text-center text-muted">{error}</p>
        )}
      </main>

      <Footer />
    </div>
  );
}
