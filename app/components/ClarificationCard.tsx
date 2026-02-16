"use client";

import type { ClarificationQuestion } from "@/app/lib/types";

interface ClarificationCardProps {
  clarification: ClarificationQuestion;
  originalQuery: string;
  onSelect: (refinedQuery: string) => void;
  isLoading: boolean;
}

export function ClarificationCard({
  clarification,
  originalQuery,
  onSelect,
  isLoading,
}: ClarificationCardProps) {
  return (
    <div
      className="mt-6 w-full max-w-sm"
      style={{ animation: "fade-in-up 400ms ease-out" }}
    >
      <p className="mb-3 text-center text-sm text-muted">
        {clarification.question}
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {clarification.options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(`${originalQuery} – ${option}`)}
            disabled={isLoading}
            className="rounded-full border border-border px-4 py-1.5 text-sm transition-all hover:border-foreground/40 hover:bg-foreground/5 active:scale-95 disabled:opacity-40"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
