import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import type { ProductRecommendation } from "@/app/lib/types";
import { toAffiliateLink } from "@/app/lib/affiliate-links";
import { analytics } from "@/app/lib/analytics";
import { ResponseCache, RateLimiter, buildCacheKey } from "@/app/lib/api-cache";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Cache identical product queries for 5 minutes to avoid duplicate API calls
const recommendCache = new ResponseCache<{ recommendation: ProductRecommendation; searchId: string }>({
  maxSize: 50,
  ttlSeconds: 300,
});

// Allow max 5 requests per minute per IP
const rateLimiter = new RateLimiter({ maxRequests: 5, windowSeconds: 60 });

const SYSTEM_PROMPT = `Product advisor for Swedish consumers. Find the ONE best product. Return ONLY JSON.

RULES:
1. MATCH QUERY EXACTLY: "stationär dator"=desktop not laptop. "32 ram"=32GB minimum. "55 tum"=55 inches. Every spec word matters.
2. buyLink = EXACT product page URL with product ID. Same product as productName. Never category/search pages.
3. SWEDISH RETAILERS ONLY: Elgiganten, NetOnNet, Webhallen, Kjell, CDON, Dustin, Komplett, MediaMarkt, IKEA.
4. IN STOCK + numeric SEK price. Skip "Slut i lager", "Kontakta butik".
5. Recommend the product itself, not accessories.
6. Always return a result. If no exact match, find closest and explain.

SEARCH: Parse query → search 2-3 Swedish retailers → compare → verify product page → pick best.

JSON format:
{"productName":"Full name with specs","price":"XX XXX kr","reason":"1-2 casual sentences in requested language. No <cite> tags.","summary":"","buyLink":"https://retailer.se/product/url","imageUrl":"URL or null","retailer":"Name"}`;

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

/**
 * Checks if the price string contains an actual numeric price.
 * Rejects "Kontakta butik", "N/A", "Pris saknas", etc.
 */
function hasValidPrice(price: string): boolean {
  if (!price) return false;
  // Must contain at least one digit to be a real price
  return /\d/.test(price);
}

const errorMessages = {
  sv: {
    emptyQuery: "Berätta vad du vill köpa.",
    noResult: "Kunde inte hitta en rekommendation.",
    parseFail: "Kunde inte tolka svaret.",
    overloaded: "Tjänsten är tillfälligt överbelastad. Försök igen om en stund.",
  },
  en: {
    emptyQuery: "Please tell us what you want to buy.",
    noResult: "No recommendation could be generated.",
    parseFail: "Could not parse recommendation.",
    overloaded: "Service is temporarily overloaded. Please try again shortly.",
  },
} as const;

/**
 * Calls the Anthropic API with retry + exponential backoff for transient errors (429, 529).
 * Retries up to `maxRetries` times with delays of 1s, 2s, 4s, ...
 */
async function callAnthropicWithRetry(
  params: Anthropic.MessageCreateParamsNonStreaming,
  maxRetries = 2,
): Promise<Anthropic.Message> {
  for (let retry = 0; retry <= maxRetries; retry++) {
    try {
      return await anthropic.messages.create(params);
    } catch (err) {
      const status =
        err instanceof Error && "status" in err
          ? (err as { status: number }).status
          : 0;
      const isRetryable = status === 429 || status === 529;

      if (!isRetryable || retry === maxRetries) {
        throw err;
      }

      const delayMs = Math.min(1000 * 2 ** retry, 8000);
      console.warn(
        `[recommend] Retryable API error (status ${status}), retrying in ${delayMs}ms (${retry + 1}/${maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  // Should never reach here, but satisfy TS
  throw new Error("Exhausted retries");
}

export async function POST(request: NextRequest) {
  let locale = "sv";
  try {
    // Rate limit by IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimiter.allow(ip)) {
      const msg = locale === "sv"
        ? "För många förfrågningar. Vänta en stund och försök igen."
        : "Too many requests. Please wait a moment and try again.";
      return NextResponse.json(
        { success: false, error: msg },
        { status: 429 },
      );
    }

    const body = await request.json();
    locale = body.locale || "sv";
    const { query, preferences, guideAnswers } = body;
    const lang = locale === "sv" ? "sv" : "en";
    const err = errorMessages[lang] || errorMessages.sv;

    if (!query?.trim()) {
      return NextResponse.json(
        { success: false, error: err.emptyQuery },
        { status: 400 },
      );
    }

    // Check cache first — return cached result for identical queries
    const cacheKey = buildCacheKey(
      query,
      String(preferences.minPrice),
      String(preferences.maxPrice),
      String(preferences.qualityPriority),
      JSON.stringify(guideAnswers || []),
    );
    const cached = recommendCache.get(cacheKey);
    if (cached) {
      console.log(`[recommend] Cache hit for query: "${query.trim()}"`);
      return NextResponse.json({ success: true, ...cached });
    }

    const prio =
      preferences.qualityPriority <= 25
        ? "cheapest option"
        : preferences.qualityPriority <= 75
          ? "balanced (good value for money)"
          : "best quality (premium)";

    const langName = locale === "sv" ? "Swedish" : "English";

    let guideContext = "";
    if (Array.isArray(guideAnswers) && guideAnswers.length > 0) {
      const lines = guideAnswers.map(
        (a: { question: string; answer: string }) => `- ${a.question} → ${a.answer}`,
      );
      guideContext = `\n\nAdditional preferences from guide:\n${lines.join("\n")}`;
    }

    const msg = `Buy: "${query.trim()}"
Budget: ${preferences.minPrice}–${preferences.maxPrice} kr. Priority: ${prio}.
Reason in ${langName}.${guideContext}${guideContext ? "\nIf a SIZE was specified (S/M/L/XL or shoe size), product MUST be in that size. Include size in search." : ""}
Search Swedish retailers, verify product page URL, return JSON.`;

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: msg },
    ];

    let parsed: Record<string, string> | null = null;
    const MAX_ATTEMPTS = 2;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      console.log(`[recommend] Attempt ${attempt + 1}/${MAX_ATTEMPTS} for query: "${query.trim()}"`);

      let response;
      try {
        response = await callAnthropicWithRetry({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          temperature: 0,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages,
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search",
              max_uses: 3,
            },
          ],
        });
      } catch (apiError) {
        const apiMsg = apiError instanceof Error ? apiError.message : String(apiError);
        console.error(`[recommend] Anthropic API error on attempt ${attempt + 1}:`, apiMsg);
        if (apiError instanceof Error && "status" in apiError) {
          console.error(`[recommend] API status: ${(apiError as { status: number }).status}`);
        }
        throw apiError;
      }

      console.log(`[recommend] API response stop_reason: ${response.stop_reason}, content blocks: ${response.content.length}`);

      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text",
      );
      const fullText = textBlocks.map((b) => b.text).join("");

      if (!fullText) {
        console.warn(`[recommend] Attempt ${attempt + 1}: No text in response. Block types: ${response.content.map((b) => b.type).join(", ")}`);
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
        console.warn(`[recommend] Attempt ${attempt + 1}: No JSON found in response text: "${fullText.slice(0, 200)}"`);
        if (attempt === MAX_ATTEMPTS - 1) {
          return NextResponse.json(
            { success: false, error: err.parseFail },
            { status: 500 },
          );
        }
        continue;
      }

      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        console.error(`[recommend] Attempt ${attempt + 1}: JSON parse failed:`, jsonMatch[0].slice(0, 200));
        if (attempt === MAX_ATTEMPTS - 1) {
          return NextResponse.json(
            { success: false, error: err.parseFail },
            { status: 500 },
          );
        }
        continue;
      }

      console.log(`[recommend] Parsed product: "${parsed?.productName}" from "${parsed?.retailer}" link: "${parsed?.buyLink}"`);

      // Validate the product type matches the search query
      // Catch obvious mismatches like searching for "stationär dator" but getting a laptop
      const queryLower = query.trim().toLowerCase();
      const productLower = (parsed?.productName || "").toLowerCase();
      const typeMismatches: [string, string[]][] = [
        // [query contains, product should NOT be]
        ["stationär", ["laptop", "bärbar", "notebook", "chromebook"]],
        ["desktop", ["laptop", "bärbar", "notebook", "chromebook"]],
        ["laptop", ["stationär", "desktop", "tower"]],
        ["bärbar", ["stationär", "desktop", "tower"]],
        ["notebook", ["stationär", "desktop", "tower"]],
      ];
      let typeMismatchFound = false;
      for (const [queryKeyword, badProductWords] of typeMismatches) {
        if (queryLower.includes(queryKeyword)) {
          for (const bad of badProductWords) {
            if (productLower.includes(bad)) {
              typeMismatchFound = true;
              console.warn(`[recommend] Attempt ${attempt + 1}: Product type mismatch — query contains "${queryKeyword}" but product "${parsed?.productName}" contains "${bad}"`);
              if (attempt < MAX_ATTEMPTS - 1) {
                messages.push(
                  { role: "assistant", content: fullText },
                  {
                    role: "user",
                    content: `Wrong type: need ${queryKeyword}, got ${bad}. Search again. Return corrected JSON.`,
                  },
                );
              }
              break;
            }
          }
          if (typeMismatchFound) break;
        }
      }
      if (typeMismatchFound) {
        parsed = null;
        continue;
      }

      // Check RAM mismatch: if query specifies RAM, product should have at least that amount
      const queryRamMatch = queryLower.match(/(\d+)\s*(?:gb\s*)?ram/);
      if (queryRamMatch && parsed?.productName) {
        const requestedRam = parseInt(queryRamMatch[1]);
        const productRamMatch = productLower.match(/(\d+)\s*(?:gb\s*)?ram/);
        if (productRamMatch) {
          const productRam = parseInt(productRamMatch[1]);
          if (productRam < requestedRam) {
            console.warn(`[recommend] Attempt ${attempt + 1}: RAM mismatch — requested ${requestedRam}GB but product has ${productRam}GB`);
            if (attempt < MAX_ATTEMPTS - 1) {
              messages.push(
                { role: "assistant", content: fullText },
                {
                  role: "user",
                  content: `Wrong RAM: need ${requestedRam}GB, got ${productRam}GB. Find one with ${requestedRam}GB+. Return corrected JSON.`,
                },
              );
              parsed = null;
              continue;
            }
          }
        }
      }

      // Validate the buyLink is a specific product page, not a category
      if (parsed?.buyLink && !isProductPageUrl(parsed.buyLink)) {
        console.warn(`[recommend] Attempt ${attempt + 1}: URL rejected as category page: "${parsed.buyLink}"`);
        if (attempt < MAX_ATTEMPTS - 1) {
          messages.push(
            { role: "assistant", content: fullText },
            {
              role: "user",
              content: `Wrong URL: "${parsed.buyLink}" is a category page. Find the direct product page URL for "${parsed.productName}" on ${parsed.retailer} with product ID in URL. Return corrected JSON.`,
            },
          );
          continue;
        }
      }

      // Validate price is a real numeric price, not "Kontakta butik" etc.
      if (parsed?.price && !hasValidPrice(parsed.price)) {
        console.warn(`[recommend] Attempt ${attempt + 1}: Invalid price "${parsed.price}" — product may be out of stock`);
        if (attempt < MAX_ATTEMPTS - 1) {
          messages.push(
            { role: "assistant", content: fullText },
            {
              role: "user",
              content: `Invalid price "${parsed.price}". Find a different in-stock product with numeric SEK price. Return corrected JSON.`,
            },
          );
          parsed = null;
          continue;
        }
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
      summary: parsed.summary || parsed.reason,
      buyLink: affiliateUrl,
      imageUrl: parsed.imageUrl || null,
      retailer: parsed.retailer,
      isAffiliate,
    };

    const searchId = crypto.randomUUID();
    try {
      await analytics.logSearch({
        id: searchId,
        type: "product",
        query: query.trim(),
        timestamp: Date.now(),
        resultName: recommendation.productName,
        resultLink: recommendation.buyLink,
        clicked: false,
      });
    } catch (dbError) {
      console.error("[recommend] Analytics DB error:", dbError instanceof Error ? dbError.message : String(dbError));
      // Don't fail the request if analytics logging fails
    }

    // Cache the result for future identical queries
    recommendCache.set(cacheKey, { recommendation, searchId });

    return NextResponse.json({ success: true, recommendation, searchId });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Recommend API error:", errMsg);
    if (stack) console.error("Recommend API stack:", stack);

    const apiStatus =
      error instanceof Error && "status" in error
        ? (error as { status: number }).status
        : 0;
    const isRateLimit = errMsg.includes("rate_limit") || apiStatus === 429;
    const isOverloaded = errMsg.includes("overloaded") || apiStatus === 529;

    const lang = locale === "sv" ? "sv" : "en";
    const errMsgs = errorMessages[lang] || errorMessages.sv;

    const message = isOverloaded
      ? errMsgs.overloaded
      : isRateLimit
        ? locale === "sv"
          ? "För många förfrågningar. Vänta en stund och försök igen."
          : "Too many requests. Please wait a moment and try again."
        : locale === "sv"
          ? "Något gick fel. Försök igen."
          : "Something went wrong. Please try again.";

    const status = isOverloaded ? 503 : isRateLimit ? 429 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}
