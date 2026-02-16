"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import type {
  UserPreferences,
  ProductRecommendation,
  ClarificationQuestion,
  RecommendResponse,
  GuideQuestion,
  GuideAnswer,
  GuideResponse,
} from "@/app/lib/types";
import { SearchForm } from "@/app/components/SearchForm";
import { ProductCard } from "@/app/components/ProductCard";
import { ClarificationCard } from "@/app/components/ClarificationCard";
import { LoadingAnimation } from "@/app/components/LoadingAnimation";
import { GuideQuestions } from "@/app/components/GuideQuestions";
import { SearchFilterSuggestions } from "@/app/components/SearchFilterSuggestions";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Footer } from "@/app/components/Footer";

type Phase = "idle" | "guide-loading" | "guide" | "searching";

/** Wide-open defaults — the AI picks the best value on its own. */
const DEFAULT_PREFERENCES: UserPreferences = {
  minPrice: 0,
  maxPrice: 1000000,
  qualityPriority: 50,
};

/**
 * Extract budget/quality preferences from guide answers.
 */
function preferencesFromGuide(answers: GuideAnswer[]): UserPreferences {
  let minPrice = 0;
  let maxPrice = 1000000;
  let qualityPriority = 50;

  for (const a of answers) {
    const val = a.answer;

    const rangeMatch = val.match(/(\d[\d\s]*)\s*[–\-]\s*(\d[\d\s]*)\s*kr/i);
    if (rangeMatch) {
      minPrice = parseInt(rangeMatch[1].replace(/\s/g, ""), 10);
      maxPrice = parseInt(rangeMatch[2].replace(/\s/g, ""), 10);
      continue;
    }
    const underMatch = val.match(/under\s+(\d[\d\s]*)\s*kr/i);
    if (underMatch) {
      minPrice = 0;
      maxPrice = parseInt(underMatch[1].replace(/\s/g, ""), 10);
      continue;
    }
    const overMatch = val.match(/(över|over)\s+(\d[\d\s]*)\s*kr/i);
    if (overMatch) {
      minPrice = parseInt(overMatch[2].replace(/\s/g, ""), 10);
      maxPrice = 1000000;
      continue;
    }

    const lower = val.toLowerCase();
    if (lower.includes("lägsta pris") || lower.includes("lowest price") || lower.includes("billigast")) {
      qualityPriority = 10;
    } else if (lower.includes("bäst värde") || lower.includes("best value") || lower.includes("balans")) {
      qualityPriority = 50;
    } else if (lower.includes("premium") || lower.includes("bäst kvalitet") || lower.includes("best quality")) {
      qualityPriority = 90;
    }
  }

  return { minPrice, maxPrice, qualityPriority };
}

export default function Home() {
  const t = useTranslations("Page");
  const locale = useLocale();

  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ProductRecommendation | null>(null);
  const [clarification, setClarification] =
    useState<ClarificationQuestion | null>(null);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [guideQuestions, setGuideQuestions] = useState<GuideQuestion[] | null>(null);
  const [lastPreferences, setLastPreferences] = useState<UserPreferences | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Prevent rapid-fire duplicate requests (2 second cooldown)
  const lastSubmitRef = useRef<number>(0);
  const COOLDOWN_MS = 2000;

  const doSearch = useCallback(
    async (searchQuery: string, guideAnswers?: GuideAnswer[], skipClarification?: boolean, prefsOverride?: UserPreferences) => {
      setPhase("searching");
      setError(null);
      setResult(null);
      setClarification(null);
      setSearchId(null);
      setGuideQuestions(null);

      const preferences = prefsOverride
        ?? (guideAnswers ? preferencesFromGuide(guideAnswers) : DEFAULT_PREFERENCES);

      setLastPreferences(preferences);

      try {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: searchQuery,
            preferences,
            locale,
            guideAnswers,
            skipClarification: skipClarification || false,
          }),
        });
        const data: RecommendResponse = await res.json();

        if (data.success && data.clarification) {
          setClarification(data.clarification);
        } else if (data.success && data.recommendation) {
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
    [locale, t],
  );

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    const now = Date.now();
    if (now - lastSubmitRef.current < COOLDOWN_MS) return;
    lastSubmitRef.current = now;

    // Always trigger guide to ask the right questions
    setPhase("guide-loading");
    setError(null);
    setResult(null);
    setClarification(null);
    setSearchId(null);
    setGuideQuestions(null);

    fetch("/api/guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, locale }),
    })
      .then((res) => res.json())
      .then((data: GuideResponse) => {
        if (data.success && data.questions && data.questions.length > 0) {
          setGuideQuestions(data.questions);
          setPhase("guide");
        } else {
          // Guide failed — search directly
          doSearch(query);
        }
      })
      .catch(() => {
        // Guide failed — search directly
        doSearch(query);
      });
  }, [query, locale, doSearch]);

  const handleGuideSubmit = useCallback(
    (answers: GuideAnswer[]) => {
      doSearch(query, answers);
    },
    [query, doSearch],
  );

  const handleClarificationSelect = useCallback(
    (refinedQuery: string) => {
      setQuery(refinedQuery);
      doSearch(refinedQuery, undefined, true);
    },
    [doSearch],
  );

  const handleGuideSkip = useCallback(() => {
    doSearch(query);
  }, [query, doSearch]);

  const handleBroadenBudget = useCallback(() => {
    if (!lastPreferences) return;
    const broader: UserPreferences = {
      ...lastPreferences,
      minPrice: 0,
      maxPrice: 1000000,
    };
    doSearch(query, undefined, true, broader);
  }, [query, lastPreferences, doSearch]);

  const handleLowerQuality = useCallback(() => {
    if (!lastPreferences) return;
    const lower: UserPreferences = {
      ...lastPreferences,
      qualityPriority: 10,
    };
    doSearch(query, undefined, true, lower);
  }, [query, lastPreferences, doSearch]);

  const handleChangeSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const isLoading = phase === "guide-loading" || phase === "searching";

  return (
    <div className="flex min-h-screen flex-col">
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <ThemeToggle />

        <p className="mb-2 text-center text-lg text-muted">
          {t("title")}
        </p>

        <SearchForm
          query={query}
          onQueryChange={setQuery}
          onSubmit={handleSearch}
          isLoading={isLoading}
          inputRef={searchInputRef}
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

        {clarification && phase === "idle" && (
          <ClarificationCard
            clarification={clarification}
            originalQuery={query}
            onSelect={handleClarificationSelect}
            isLoading={isLoading}
          />
        )}

        {result && phase === "idle" && (
          <ProductCard recommendation={result} searchId={searchId ?? undefined} />
        )}

        {error && phase === "idle" && (
          <>
            <p className="mt-8 text-center text-sm text-muted">{error}</p>
            <SearchFilterSuggestions
              lastPreferences={lastPreferences}
              onBroadenBudget={handleBroadenBudget}
              onLowerQuality={handleLowerQuality}
              onChangeSearch={handleChangeSearch}
            />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
