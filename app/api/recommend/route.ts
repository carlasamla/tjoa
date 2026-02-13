import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import type { ProductRecommendation } from "@/app/lib/types";
import { toAffiliateLink } from "@/app/lib/affiliate-links";
import { analytics } from "@/app/lib/analytics";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Product recommendation expert for Swedish market. Return ONLY a JSON object, no other text.

JSON format:
{"productName":"...","price":"... kr","reason":"1-2 sentences","buyLink":"URL","imageUrl":"URL or null","retailer":"..."}

Rules:
- Search Swedish retailers: Elgiganten, NetOnNet, Webhallen, Kjell, CDON, Dustin, Komplett, MediaMarkt, IKEA
- NEVER use Amazon or non-Swedish sites
- Prices in SEK
- buyLink must be a DIRECT product page URL on the retailer's site where the user can buy it. Search the retailer's website to find the actual product page.
- You MUST ALWAYS return a product recommendation. NEVER return an error. If you can't find the exact product, recommend the closest alternative you can find on a Swedish retailer. There is always something to recommend.`;

const errorMessages = {
  sv: {
    emptyQuery: "Berätta vad du vill köpa.",
    noResult: "Kunde inte hitta en rekommendation.",
    parseFail: "Kunde inte tolka svaret.",
  },
  en: {
    emptyQuery: "Please tell us what you want to buy.",
    noResult: "No recommendation could be generated.",
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

    const prio =
      preferences.qualityPriority <= 25
        ? "cheapest"
        : preferences.qualityPriority <= 75
          ? "balanced"
          : "best quality";

    const msg = `Buy: ${query.trim()}
Budget: ${preferences.minPrice}-${preferences.maxPrice} kr. Priority: ${prio}.
Reason in ${locale === "sv" ? "Swedish" : "English"}. Search Swedish retailers.`;

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
    const { url: affiliateUrl, isAffiliate } = toAffiliateLink(
      parsed.buyLink,
      parsed.retailer,
    );

    const recommendation: ProductRecommendation = {
      productName: parsed.productName,
      price: parsed.price,
      reason: parsed.reason,
      buyLink: affiliateUrl,
      imageUrl: parsed.imageUrl || null,
      retailer: parsed.retailer,
      isAffiliate,
    };

    const searchId = crypto.randomUUID();
    analytics.logSearch({
      id: searchId,
      type: "product",
      query: query.trim(),
      timestamp: Date.now(),
      resultName: recommendation.productName,
      resultLink: recommendation.buyLink,
      clicked: false,
    });

    return NextResponse.json({ success: true, recommendation, searchId });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Recommend API error:", errMsg);

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
