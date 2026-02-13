"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function EngagementTracker() {
  const pathname = usePathname();
  const startTime = useRef(Date.now());
  const sessionId = useRef(
    typeof crypto !== "undefined"
      ? crypto.randomUUID()
      : Math.random().toString(36),
  );

  useEffect(() => {
    startTime.current = Date.now();

    const sendEngagement = () => {
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      if (duration < 2) return;
      navigator.sendBeacon(
        "/api/analytics",
        new Blob(
          [
            JSON.stringify({
              type: "engagement",
              page: pathname,
              sessionId: sessionId.current,
              duration,
            }),
          ],
          { type: "application/json" },
        ),
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendEngagement();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", sendEngagement);

    return () => {
      sendEngagement();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", sendEngagement);
    };
  }, [pathname]);

  return null;
}
