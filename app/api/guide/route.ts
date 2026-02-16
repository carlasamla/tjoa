import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { GuideQuestion } from "@/app/lib/types";
import { ResponseCache, RateLimiter, buildCacheKey } from "@/app/lib/api-cache";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Cache guide questions for 10 minutes — these change rarely for the same query
const guideCache = new ResponseCache<{ questions: GuideQuestion[] }>({
  maxSize: 50,
  ttlSeconds: 600,
});

// Allow max 5 requests per minute per IP
const rateLimiter = new RateLimiter({ maxRequests: 5, windowSeconds: 60 });

const SYSTEM_PROMPT = `Generate 3-5 follow-up questions to narrow down a product search. Each with 3-4 short options (1-5 words). For each question, pick the BEST default option ("recommended") — the most popular/sensible choice for most people.

Rules:
- Relevant to product type. Don't repeat info already in query.
- CLOTHING/SHOES: First question MUST be size (clothing: XS/S/M/L/XL/XXL, shoes: EU 36-38/39-41/42-44/45-48). Skip if size already in query. Recommended: M for clothing, EU 42-44 for shoes.
- Second-to-last: budget question with category-appropriate SEK ranges. Recommended: middle range.
- Last: priority question ("Lägsta pris"/"Bäst värde"/"Premiumkvalitet"). Recommended: "Bäst värde".
- Match query language (Swedish/English).

Return ONLY JSON: [{"id":"q1","question":"...","options":["A","B","C"],"recommended":"B"}]`;

const errorMessages = {
  sv: {
    emptyQuery: "Ange vad du letar efter.",
    failed: "Kunde inte generera frågor.",
  },
  en: {
    emptyQuery: "Please enter what you're looking for.",
    failed: "Could not generate questions.",
  },
} as const;

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimiter.allow(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many requests." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { query, locale = "sv" } = body;
    const lang = locale === "sv" ? "sv" : "en";
    const err = errorMessages[lang];

    if (!query?.trim()) {
      return NextResponse.json(
        { success: false, error: err.emptyQuery },
        { status: 400 },
      );
    }

    // Check cache first
    const cacheKey = buildCacheKey(query, locale);
    const cached = guideCache.get(cacheKey);
    if (cached) {
      console.log(`[guide] Cache hit for query: "${query.trim()}"`);
      return NextResponse.json({ success: true, ...cached });
    }

    const langName = locale === "sv" ? "Swedish" : "English";
    const msg = `Product search query: "${query.trim()}"
Language: ${langName}

Generate follow-up questions to help find the perfect product.`;

    let response;
    for (let retry = 0; retry <= 2; retry++) {
      try {
        response = await anthropic.messages.create({
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
          messages: [{ role: "user", content: msg }],
        });
        break;
      } catch (apiErr) {
        const status =
          apiErr instanceof Error && "status" in apiErr
            ? (apiErr as { status: number }).status
            : 0;
        if ((status === 429 || status === 529) && retry < 2) {
          const delay = Math.min(1000 * 2 ** retry, 8000);
          console.warn(`[guide] Retryable error (${status}), retry in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw apiErr;
      }
    }

    if (!response) {
      return NextResponse.json(
        { success: false, error: err.failed },
        { status: 500 },
      );
    }

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );
    const fullText = textBlocks.map((b) => b.text).join("");

    const jsonMatch = fullText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("[guide] No JSON array in response:", fullText.slice(0, 200));
      return NextResponse.json(
        { success: false, error: err.failed },
        { status: 500 },
      );
    }

    let questions: GuideQuestion[];
    try {
      questions = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("[guide] JSON parse failed:", jsonMatch[0].slice(0, 200));
      return NextResponse.json(
        { success: false, error: err.failed },
        { status: 500 },
      );
    }

    // Validate structure and ensure recommended is set
    questions = questions
      .filter(
        (q) =>
          q.id &&
          q.question &&
          Array.isArray(q.options) &&
          q.options.length >= 2,
      )
      .map((q) => ({
        ...q,
        recommended: q.recommended && q.options.includes(q.recommended)
          ? q.recommended
          : q.options[Math.floor(q.options.length / 2)],
      }))
      .slice(0, 5);

    if (questions.length === 0) {
      return NextResponse.json(
        { success: false, error: err.failed },
        { status: 500 },
      );
    }

    // Cache the result
    guideCache.set(cacheKey, { questions });

    return NextResponse.json({ success: true, questions });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[guide] API error:", errMsg);
    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 },
    );
  }
}
