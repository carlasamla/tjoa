"use client";

import { useTranslations } from "next-intl";

interface SearchFormProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  placeholderKey?: string;
  buttonKey?: string;
}

export function SearchForm({
  query,
  onQueryChange,
  onSubmit,
  isLoading,
  placeholderKey = "Search",
  buttonKey = "Search",
}: SearchFormProps) {
  const tp = useTranslations(placeholderKey);
  const tb = useTranslations(buttonKey);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex w-full max-w-sm flex-col gap-2 sm:flex-row"
    >
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={tp("placeholder")}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-foreground/20"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-40"
      >
        {tb("button")}
      </button>
    </form>
  );
}
