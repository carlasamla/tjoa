"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ProductRecommendation } from "@/app/lib/types";

interface ProductCardProps {
  recommendation: ProductRecommendation;
  searchId?: string;
}

export function ProductCard({ recommendation, searchId }: ProductCardProps) {
  const t = useTranslations("Product");
  const [imageError, setImageError] = useState(false);

  const handleBuyClick = () => {
    if (searchId) {
      navigator.sendBeacon(
        "/api/analytics",
        new Blob(
          [JSON.stringify({ type: "click", searchId, link: recommendation.buyLink })],
          { type: "application/json" },
        ),
      );
    }
  };

  return (
    <div
      className="mt-6 w-full max-w-sm rounded-xl border border-border p-4"
      style={{ animation: "fade-in-up 400ms ease-out" }}
    >
      {recommendation.imageUrl && !imageError && (
        <div className="mb-3 overflow-hidden rounded-lg bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recommendation.imageUrl}
            alt={recommendation.productName}
            className="h-40 w-full object-contain sm:h-36"
            onError={() => setImageError(true)}
          />
        </div>
      )}

      <h2 className="text-center text-base font-semibold">{recommendation.productName}</h2>

      <p className="mt-1 text-center text-sm">
        <span className="font-semibold">{recommendation.price}</span>
        <span className="text-muted">
          {" "}
          {t("on", { retailer: recommendation.retailer })}
        </span>
      </p>

      <p className="mt-2 text-center text-xs text-muted">{recommendation.reason}</p>

      <div className="mt-3 flex justify-center">
        <a
          href={recommendation.buyLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleBuyClick}
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 active:bg-foreground/80 sm:px-4 sm:py-2"
        >
        {t("buyOn", { retailer: recommendation.retailer })}
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
      {recommendation.isAffiliate && (
        <p className="mt-2 text-center text-[10px] text-muted">
          {t("affiliateDisclosure")}
        </p>
      )}
    </div>
  );
}
