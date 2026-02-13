import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { StockRecommendation } from "@/app/lib/types";
import { toAvanzaAffiliateLink } from "@/app/lib/affiliate-links";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Investment recommendation expert for Swedish market. Recommend stocks, crypto, or certificates available on Avanza. Return ONLY a JSON object, no other text.

JSON format:
{"stockName":"...","ticker":"...","price":"... kr","reason":"1-2 sentences","buyLink":"URL","sector":"...","type":"stock|crypto|certificate"}

Rules:
- Search Avanza (avanza.se) for stocks, crypto, and certificates (certifikat)
- buyLink must be a DIRECT link to the product page on avanza.se
- Prices in SEK
- type must be "stock", "crypto", or "certificate"
- You MUST ALWAYS return a recommendation. NEVER return an error. There is always something to recommend.`;

const errorMessages = {
  sv: {
    emptyQuery: "Berätta vad du vill investera i.",
    noResult: "Kunde inte hitta en investering.",
    parseFail: "Kunde inte tolka svaret.",
  },
  en: {
    emptyQuery: "Please tell us what you want to invest in.",
    noResult: "No investment recommendation could be generated.",
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

    const riskLabel =
      preferences.risk <= 25
        ? "low"
        : preferences.risk <= 75
          ? "medium"
          : "high";

    const rewardLabel =
      preferences.reward <= 25
        ? "low"
        : preferences.reward <= 75
          ? "medium"
          : "high";

    const msg = `Sector: ${query.trim()}
Risk: ${riskLabel}. Reward: ${rewardLabel}. Max price: ${preferences.maxPrice} kr per share.
Reason in ${locale === "sv" ? "Swedish" : "English"}. Search Avanza.`;

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
    const { url: affiliateUrl, isAffiliate } = toAvanzaAffiliateLink(
      parsed.buyLink,
    );

    const recommendation: StockRecommendation = {
      stockName: parsed.stockName,
      ticker: parsed.ticker,
      price: parsed.price,
      reason: parsed.reason,
      buyLink: affiliateUrl,
      sector: parsed.sector,
      type: parsed.type || "stock",
      isAffiliate,
    };

    return NextResponse.json({ success: true, recommendation });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Stocks API error:", errMsg);

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
