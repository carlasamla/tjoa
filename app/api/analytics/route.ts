import { NextRequest, NextResponse } from "next/server";
import { analytics } from "@/app/lib/analytics";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === "click") {
      const { searchId, link } = body;
      if (searchId && link) {
        analytics.logClick(searchId, link);
      }
    } else if (type === "engagement") {
      const { page, sessionId, duration } = body;
      if (page && sessionId && duration) {
        analytics.logEngagement({
          page,
          sessionId,
          duration,
          timestamp: Date.now(),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
