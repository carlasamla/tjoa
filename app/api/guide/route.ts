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

const SYSTEM_PROMPT = `You generate short, helpful follow-up questions to help a user find the right product.

Given a product search query, return 3–5 questions that would help narrow down the best match. Each question should have 3–4 short answer options.

Rules:
- Questions must be directly relevant to the specific product type in the query.
- Keep questions short (one line).
- Keep options short (1–5 words each).
- Don't repeat information already in the query.
- If the query already specifies a detail (e.g. "32GB RAM laptop"), don't ask about that detail.
- Focus on the most important differentiating factors for that product category.
- CLOTHING & SHOES SIZE RULE: If the query is about clothing, shoes, or any wearable item (e.g. jacka, tröja, byxor, klänning, skor, sneakers, boots, t-shirt, hoodie, shorts, jeans, dress, jacket, pants, coat, shirt), you MUST include a SIZE question as the FIRST question. Use appropriate size options for the product type:
  - Clothing: "XS", "S", "M", "L", "XL" (or "34", "36", "38", "40", "42" for more formal clothing)
  - Shoes: Common EU sizes like "36–37", "38–39", "40–41", "42–43", "44–45"
  - If the query already specifies a size, skip this question.
- ALWAYS include a budget question as the SECOND TO LAST question. Use price ranges calibrated to the product category. Examples:
  - Headphones: "Under 500 kr", "500–1 500 kr", "1 500–3 000 kr", "Över 3 000 kr"
  - Laptops: "Under 8 000 kr", "8 000–15 000 kr", "15 000–25 000 kr", "Över 25 000 kr"
  - TVs: "Under 5 000 kr", "5 000–10 000 kr", "10 000–20 000 kr", "Över 20 000 kr"
  Adapt the ranges to what makes sense for the specific product type.
- ALWAYS include a priority question as the LAST question, asking what matters most. Use options like: "Lägsta pris" / "Lowest price", "Bäst värde för pengarna" / "Best value", "Premiumkvalitet" / "Premium quality".
- Write questions and options in the same language as the user's query. If the query is in Swedish, write in Swedish. If in English, write in English.

Return ONLY a JSON array, no other text:
[{"id":"q1","question":"...","options":["...","...","..."]},...]`;

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

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: msg }],
    });

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

    // Validate structure
    questions = questions
      .filter(
        (q) =>
          q.id &&
          q.question &&
          Array.isArray(q.options) &&
          q.options.length >= 2,
      )
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
