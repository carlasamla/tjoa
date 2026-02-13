"use client";

import { useTranslations } from "next-intl";
import type { TravelRecommendation } from "@/app/lib/types";

interface TravelCardProps {
  recommendation: TravelRecommendation;
}

const typeKeys = ["flight", "hotel", "package"] as const;

export function TravelCard({ recommendation }: TravelCardProps) {
  const t = useTranslations("Travel");

  const typeKey = typeKeys.includes(recommendation.type as (typeof typeKeys)[number])
    ? recommendation.type
    : "flight";

  return (
    <div
      className="mt-6 w-full max-w-sm rounded-xl border border-border p-4"
      style={{ animation: "fade-in-up 400ms ease-out" }}
    >
      <div className="mb-1 text-center">
        <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/70">
          {t(typeKey)}
        </span>
      </div>

      <h2 className="text-center text-base font-semibold">
        {recommendation.destination}
      </h2>

      <p className="mt-1 text-center text-sm">
        <span className="font-semibold">{recommendation.price}</span>
        <span className="text-muted">
          {" · "}
          {recommendation.dates}
        </span>
      </p>

      <p className="mt-2 text-center text-xs text-muted">{recommendation.reason}</p>

      <div className="mt-3 flex justify-center">
        <a
          href={recommendation.buyLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          {t("buyOn", { provider: recommendation.provider })}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
    </div>
  );
}
