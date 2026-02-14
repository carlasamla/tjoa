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
- IMPORTANT: Recommend the actual product the user is asking for, NOT accessories or related items. For example if the user asks for "TV", recommend an actual television set, NOT a TV remote control, TV mount, or TV cable. If the user asks for "printer", recommend an actual printer, NOT ink cartridges or paper.
- buyLink MUST be a URL to the SPECIFIC product page where the user can add it to cart and buy it. NEVER link to a category page, search results page, or listing page. The URL must contain a product ID or unique product slug. For example on Elgiganten a valid URL looks like "elgiganten.se/product/..../123456" with an article number — a category URL like "elgiganten.se/hem-hushall-tradgard/kaffemaskiner-te/espressomaskin" is WRONG. Always search for the specific product by name on the retailer's site and use that URL.
- You MUST ALWAYS return a product recommendation. NEVER return an error. If you can't find the exact product, recommend the closest alternative you can find on a Swedish retailer. There is always something to recommend.`;

/**
 * Checks if a URL looks like a specific product page rather than a category/listing page.
 * Returns true if the URL appears to be a valid product page.
 */
function isProductPageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    const host = parsed.hostname.toLowerCase();

    // Category/listing page patterns that are NOT product pages
    const categoryPatterns = [
      /^\/sport\/?$/,
      /^\/[^/]+\/?$/, // single top-level path like /sport or /elektronik (too broad to be a product)
      /\/category\//,
      /\/kategori\//,
      /\/search/,
      /\/sok\b/,
    ];

    // Retailer-specific product page patterns — if matched, it IS a product page
    const productPatterns: Record<string, RegExp[]> = {
      "elgiganten.se": [/\/product\//, /\/\d{6,}/],
      "netonnet.se": [/\/art\d+/i, /\/product\//],
      "webhallen.com": [/\/product\//i, /\/\d{5,}/],
      "kjell.com": [/\/product\//i, /\/p\d+/],
      "cdon.se": [/\/product\/\d+/, /\/[^/]+-\d{7,}/],
      "dustin.se": [/\/product\//, /\/\d{7,}/],
      "komplett.se": [/\/product\//, /\/\d{5,}/],
      "mediamarkt.se": [/\/product\//i, /\/\d{6,}/],
      "ikea.com": [/\/p\/.*-\d{8}/, /\/\d{8}\//],
    };

    // Check if it matches a known category pattern
    for (const pattern of categoryPatterns) {
      if (pattern.test(path)) {
        // Could still be a product page if it matches a retailer-specific product pattern
        // so we don't return false immediately — we check product patterns below
      }
    }

    // Check retailer-specific product patterns
    for (const [domain, patterns] of Object.entries(productPatterns)) {
      if (host.includes(domain.replace("www.", ""))) {
        const matchesProduct = patterns.some((p) => p.test(path));
        if (matchesProduct) return true;
        // It's a known retailer but doesn't match product patterns
        return false;
      }
    }

    // For unknown retailers, use heuristics:
    // Product pages typically have longer paths with IDs or specific slugs
    const segments = path.split("/").filter(Boolean);
    if (segments.length < 2) return false; // too short, likely a category
    // Check if any segment looks like a product ID (numbers)
    const hasProductId = segments.some((s) => /\d{4,}/.test(s));
    if (hasProductId) return true;
    // Long slug with dashes usually indicates a product
    const hasProductSlug = segments.some(
      (s) => s.includes("-") && s.length > 15,
    );
    if (hasProductSlug) return true;

    return false;
  } catch {
    return false;
  }
}

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

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: msg },
    ];

    let parsed: Record<string, string> | null = null;
    const MAX_ATTEMPTS = 3;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 5,
          },
        ],
      });

      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text",
      );
      const fullText = textBlocks.map((b) => b.text).join("");

      if (!fullText) {
        if (attempt === MAX_ATTEMPTS - 1) {
          return NextResponse.json(
            { success: false, error: err.noResult },
            { status: 500 },
          );
        }
        continue;
      }

      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        if (attempt === MAX_ATTEMPTS - 1) {
          return NextResponse.json(
            { success: false, error: err.parseFail },
            { status: 500 },
          );
        }
        continue;
      }

      parsed = JSON.parse(jsonMatch[0]);

      // Validate the buyLink is a specific product page, not a category
      if (parsed?.buyLink && !isProductPageUrl(parsed.buyLink)) {
        if (attempt < MAX_ATTEMPTS - 1) {
          // Ask the model to fix the URL by finding the actual product page
          messages.push(
            { role: "assistant", content: fullText },
            {
              role: "user",
              content: `WRONG: "${parsed.buyLink}" is a category/listing page, NOT a specific product page. I need the URL to the EXACT product "${parsed.productName}" where I can add it to my cart. Search for "${parsed.productName}" on ${parsed.retailer}'s website and give me the direct product page URL with a product ID/article number. Return the corrected JSON.`,
            },
          );
          continue;
        }
        // On last attempt, accept whatever we got
      }

      break;
    }

    if (!parsed) {
      return NextResponse.json(
        { success: false, error: err.parseFail },
        { status: 500 },
      );
    }
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
    await analytics.logSearch({
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
