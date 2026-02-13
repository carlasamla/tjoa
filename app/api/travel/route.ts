import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { TravelRecommendation } from "@/app/lib/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Travel recommendation expert for Swedish travelers. Return ONLY a JSON object, no other text.

JSON format:
{"destination":"...","price":"... kr","reason":"1-2 sentences","buyLink":"URL","provider":"...","type":"flight|hotel|package","dates":"..."}

Rules:
- Search Swedish travel sites: SAS, Norwegian, Momondo, Skyscanner, Booking.com, TUI, Ving, Apollo
- buyLink must be a DIRECT link to the deal on the provider's site
- Prices in SEK
- type must be "flight", "hotel", or "package"
- dates should be a suggested travel period
- You MUST ALWAYS return a recommendation. NEVER return an error. There is always something to recommend.`;

const errorMessages = {
  sv: {
    emptyQuery: "Berätta vart du vill resa.",
    noResult: "Kunde inte hitta en resa.",
    parseFail: "Kunde inte tolka svaret.",
  },
  en: {
    emptyQuery: "Please tell us where you want to travel.",
    noResult: "No travel recommendation could be generated.",
    parseFail: "Could not parse recommendation.",
  },
} as const;

export async function POST(request: NextRequest) {
  let locale = "sv";
  try {
    const body = await request.json();
    locale = body.locale || "sv";
    const { query, preferences } = body;
    const lang = locale === "sv" ? "sv" : "en";
    const err = errorMessages[lang] || errorMessages.sv;

    if (!query?.trim()) {
      return NextResponse.json(
        { success: false, error: err.emptyQuery },
        { status: 400 },
      );
    }

    const comfortLabel =
      preferences.comfort <= 25
        ? "cheapest"
        : preferences.comfort <= 75
          ? "balanced"
          : "premium/comfortable";

    const msg = `Destination: ${query.trim()}
Budget: max ${preferences.budget} kr. Comfort: ${comfortLabel}.
Reason in ${locale === "sv" ? "Swedish" : "English"}. Search Swedish travel sites.`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: msg }],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 3,
        },
      ],
    });

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );
    const fullText = textBlocks.map((b) => b.text).join("");

    if (!fullText) {
      return NextResponse.json(
        { success: false, error: err.noResult },
        { status: 500 },
      );
    }

    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { success: false, error: err.parseFail },
        { status: 500 },
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const recommendation: TravelRecommendation = {
      destination: parsed.destination,
      price: parsed.price,
      reason: parsed.reason,
      buyLink: parsed.buyLink,
      provider: parsed.provider,
      type: parsed.type || "flight",
      dates: parsed.dates,
    };

    return NextResponse.json({ success: true, recommendation });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Travel API error:", errMsg);

    const isRateLimit = errMsg.includes("rate_limit");

    const message = isRateLimit
      ? locale === "sv"
        ? "För många förfrågningar. Vänta en stund och försök igen."
        : "Too many requests. Please wait a moment and try again."
      : locale === "sv"
        ? "Något gick fel. Försök igen."
        : "Something went wrong. Please try again.";

    return NextResponse.json(
      { success: false, error: message },
      { status: isRateLimit ? 429 : 500 },
    );
  }
}
