"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface LoadingAnimationProps {
  loadingKey?: string;
}

const loadingKeys: Record<string, readonly string[]> = {
  Loading: ["searching", "reviews", "comparing", "finding"],
  StockLoading: ["searching", "analyzing", "comparing", "finding"],
  TravelLoading: ["searching", "analyzing", "comparing", "finding"],
};

export function LoadingAnimation({ loadingKey = "Loading" }: LoadingAnimationProps) {
  const t = useTranslations(loadingKey);
  const [messageIndex, setMessageIndex] = useState(0);

  const keys = loadingKeys[loadingKey] || loadingKeys.Loading;

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % keys.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [keys.length]);

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full bg-foreground/60"
            style={{
              animation: "pulse-dot 1.4s infinite ease-in-out",
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
      <p className="text-xs text-muted">{t(keys[messageIndex])}</p>
    </div>
  );
}
