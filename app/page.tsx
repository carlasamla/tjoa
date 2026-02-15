"use client";

import { useState, useCallback, useRef } from "react";
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
import { LoadingAnimation } from "@/app/components/LoadingAnimation";
import { GuideQuestions } from "@/app/components/GuideQuestions";

import { NavMenu } from "@/app/components/NavMenu";
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
 * Try to extract budget/quality preferences from guide answers.
 * Looks for price-related answers (containing "kr" or digits) and
 * quality-priority answers to build a more specific preference object.
 */
function preferencesFromGuide(answers: GuideAnswer[]): UserPreferences {
  let minPrice = 0;
  let maxPrice = 1000000;
  let qualityPriority = 50;

  for (const a of answers) {
    const val = a.answer;

    // Detect budget answers like "5 000–10 000 kr", "Under 500 kr", "Över 25 000 kr"
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

    // Detect quality/priority answers
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
  const [searchId, setSearchId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [guideQuestions, setGuideQuestions] = useState<GuideQuestion[] | null>(null);

  // Prevent rapid-fire duplicate requests (2 second cooldown)
  const lastSubmitRef = useRef<number>(0);
  const COOLDOWN_MS = 2000;

  const doSearch = useCallback(
    async (guideAnswers?: GuideAnswer[]) => {
      setPhase("searching");
      setError(null);
      setResult(null);
      setSearchId(null);
      setGuideQuestions(null);

      const preferences = guideAnswers
        ? preferencesFromGuide(guideAnswers)
        : DEFAULT_PREFERENCES;

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
    [query, locale, t],
  );

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    const now = Date.now();
    if (now - lastSubmitRef.current < COOLDOWN_MS) return;
    lastSubmitRef.current = now;
    doSearch();
  }, [query, doSearch]);

  const handleGuide = useCallback(async () => {
    if (!query.trim()) return;
    const now = Date.now();
    if (now - lastSubmitRef.current < COOLDOWN_MS) return;
    lastSubmitRef.current = now;

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
