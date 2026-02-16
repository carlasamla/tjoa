"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import type { GuideQuestion, GuideAnswer } from "@/app/lib/types";
import { cn } from "@/app/lib/utils";

interface GuideQuestionsProps {
  questions: GuideQuestion[];
  onSubmit: (answers: GuideAnswer[]) => void;
  onSkip: () => void;
  isLoading: boolean;
}

export function GuideQuestions({
  questions,
  onSubmit,
  onSkip,
  isLoading,
}: GuideQuestionsProps) {
  const t = useTranslations("Guide");
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Auto-select recommended options on mount
  useEffect(() => {
    const defaults: Record<string, string> = {};
    for (const q of questions) {
      if (q.recommended && q.options.includes(q.recommended)) {
        defaults[q.id] = q.recommended;
      }
    }
    setSelections(defaults);
  }, [questions]);

  const handleOptionChange = (questionId: string, values: string[]) => {
    const value = values[0];
    if (value) {
      setSelections((prev) => ({ ...prev, [questionId]: value }));
    } else {
      setSelections((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  const handleSubmit = () => {
    const answers: GuideAnswer[] = questions
      .filter((q) => selections[q.id])
      .map((q) => ({
        questionId: q.id,
        question: q.question,
        answer: selections[q.id],
      }));
    onSubmit(answers);
  };

  return (
    <div
      className="mt-6 w-full max-w-md"
      style={{ animation: "fade-in-up 400ms ease-out" }}
    >
      <div className="space-y-5">
        {questions.map((q, idx) => (
          <div key={q.id} style={{ animation: `fade-in-up 400ms ease-out ${idx * 100}ms both` }}>
            <p className="mb-2 text-sm text-foreground">{q.question}</p>
            <ToggleGroup
              value={selections[q.id] ? [selections[q.id]] : []}
              onValueChange={(values) => handleOptionChange(q.id, values)}
              className="flex flex-wrap gap-2"
            >
              {q.options.map((option) => (
                <Toggle
                  key={option}
                  value={option}
                  disabled={isLoading}
                  className={cn(
                    "rounded-full border border-border px-3 py-1.5 text-xs transition-all",
                    "hover:border-foreground/40 hover:bg-foreground/5",
                    "data-[pressed]:border-foreground data-[pressed]:bg-foreground data-[pressed]:text-background",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                  )}
                >
                  {option}
                </Toggle>
              ))}
            </ToggleGroup>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          onClick={onSkip}
          disabled={isLoading}
          className="rounded-lg px-4 py-2 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-40"
        >
          {t("skip")}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="rounded-lg bg-foreground px-5 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-40"
        >
          {t("search")}
        </button>
      </div>
    </div>
  );
}
