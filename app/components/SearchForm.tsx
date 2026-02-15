"use client";

import { useTranslations } from "next-intl";
import { Input } from "@base-ui/react/input";

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
      className="flex w-full max-w-md flex-col items-center gap-3"
    >
      <Input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={tp("placeholder")}
        className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-center text-base placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-40"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="rounded-lg bg-white px-6 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90 dark:bg-white dark:text-black dark:hover:bg-white/90 disabled:opacity-40"
      >
        {tb("button")}
      </button>
    </form>
  );
}
