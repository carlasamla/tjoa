import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import type { ProductRecommendation } from "@/app/lib/types";
import { toAffiliateLink } from "@/app/lib/affiliate-links";
import { analytics } from "@/app/lib/analytics";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a product search engine for Swedish consumers. Your job is to find ONE specific product that EXACTLY matches what the user is looking for, and return a direct link to buy it.

## CRITICAL RULES — FOLLOW EVERY SINGLE ONE

### 1. MATCH THE SEARCH QUERY EXACTLY
This is the most important rule. Every word in the user's search matters:
- "stationär dator" = DESKTOP computer. NEVER return a laptop.
- "laptop" = LAPTOP. NEVER return a desktop.
- "32 ram" or "32GB RAM" = must have 32GB RAM. NEVER return 16GB.
- "55 tum TV" = must be 55 inches. NEVER return 50 or 65 inch.
- "trådlös mus" = must be wireless. NEVER return a wired mouse.
If the user specifies a spec (RAM, storage, screen size, color, etc.), the product you recommend MUST have that exact spec or better. If you cannot find an exact match, find the CLOSEST match and explain in the reason field what differs.

### 2. THE LINK MUST GO TO THE EXACT PRODUCT YOU RECOMMEND
This is equally critical. The buyLink URL must point to THE SAME product as productName.
- First, find the product. Note its exact name, specs, and price.
- Then, get the URL from THAT product's page on the retailer's site.
- NEVER mix up products: do not display one product's name but link to a different product's URL.
- VERIFY: The product ID/name in the URL should match the product you are recommending.

### 3. THE LINK MUST BE A SPECIFIC PRODUCT PAGE
The buyLink must be a direct URL to a product page where the user can add it to cart and buy it.
- GOOD: "komplett.se/product/1234567" (specific product with ID)
- GOOD: "elgiganten.se/product/namn-pa-produkt/123456" (with article number)
- BAD: "komplett.se/category/datorer" (category page)
- BAD: "elgiganten.se/search?q=dator" (search results page)
- BAD: "netonnet.se/hem-hushall/datorer" (listing page)
The URL MUST contain a product ID or article number.

### 4. ONLY SWEDISH RETAILERS
Search these retailers: Elgiganten, NetOnNet, Webhallen, Kjell, CDON, Dustin, Komplett, MediaMarkt, IKEA.
NEVER use Amazon, eBay, or non-Swedish sites.

### 5. PRODUCT MUST BE IN STOCK WITH A REAL PRICE
- Only recommend products that are in stock and available to buy.
- Skip products marked "Slut i lager", "Slutsåld", "Ej i lager", "Tillfälligt slut", etc.
- Price must be numeric in SEK (e.g. "12 499 kr"). NEVER use "Kontakta butik", "N/A", or non-numeric prices.

### 6. RECOMMEND THE ACTUAL PRODUCT, NOT ACCESSORIES
If the user asks for "TV", return a television — not a TV mount or cable.
If the user asks for "dator", return a computer — not a keyboard or mouse.

### 7. ALWAYS RETURN A RESULT
You must always return a recommendation. If you can't find the exact product, find the closest match and explain what differs.

## SEARCH STRATEGY
1. Parse the user's query to understand: product type, required specs, budget
2. Search for the product on Swedish retailer websites
3. Find a product that matches ALL specified criteria
4. Open the product page to verify: name, specs, price, stock status, and URL
5. Return the result

## RESPONSE FORMAT
Return ONLY a JSON object, no other text:
{"productName":"Full product name with key specs","price":"XX XXX kr","reason":"1-2 sentences in requested language","buyLink":"https://retailer.se/product/exact-product-page-url","imageUrl":"URL or null","retailer":"Retailer name"}`;

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
  maxRetries = 3,
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

    const msg = `I want to buy: "${query.trim()}"

Budget: ${preferences.minPrice}–${preferences.maxPrice} kr
Priority: ${prio}
Write the reason in ${langName}.${guideContext}

IMPORTANT: Read my search query carefully. Every word matters. If I specify a product type (e.g. "stationär dator" means desktop, "laptop" means laptop), specs (e.g. "32 ram" means 32GB RAM), size, color, or any other detail — the product you recommend MUST match those criteria.${guideContext ? "\nAlso factor in the additional preferences from the guide above when choosing the best product." : ""}

Search Swedish retailers, find a specific product that matches, verify the product page URL, and return the JSON.`;

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: msg },
    ];

    let parsed: Record<string, string> | null = null;
    const MAX_ATTEMPTS = 3;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      console.log(`[recommend] Attempt ${attempt + 1}/${MAX_ATTEMPTS} for query: "${query.trim()}"`);

      let response;
      try {
        response = await callAnthropicWithRetry({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages,
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search",
              max_uses: 10,
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
      } catch (parseError) {
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
                    content: `WRONG: I searched for "${query.trim()}" which requires a ${queryKeyword}, but you recommended "${parsed?.productName}" which is a ${bad}. These are completely different product types. Search again and find a product that is actually a ${queryKeyword}. Return the corrected JSON.`,
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
                  content: `WRONG: I asked for ${requestedRam}GB RAM but you recommended "${parsed.productName}" which only has ${productRam}GB RAM. Find a product with at least ${requestedRam}GB RAM. Return the corrected JSON.`,
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
              content: `WRONG: "${parsed.buyLink}" is a category/listing page, NOT a specific product page. I need the URL to the EXACT product "${parsed.productName}" where I can add it to my cart. Search for "${parsed.productName}" on ${parsed.retailer}'s website and give me the direct product page URL with a product ID/article number in the URL. Return the corrected JSON. Remember: the link MUST go to the SAME product you put in productName.`,
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
              content: `WRONG: The price "${parsed.price}" is not a valid price — the product is likely out of stock or unavailable. Find a DIFFERENT product that is actually IN STOCK with a real numeric price in SEK (e.g. "1 299 kr"). Search again on a Swedish retailer and return a new recommendation. Make sure the link goes to the exact product you name.`,
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
