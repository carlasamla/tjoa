import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { GuideQuestion } from "@/app/lib/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You generate short, helpful follow-up questions to help a user find the right product.

Given a product search query, return 2–4 questions that would help narrow down the best match. Each question should have 3–4 short answer options.

Rules:
- Questions must be directly relevant to the specific product type in the query.
- Keep questions short (one line).
- Keep options short (1–4 words each).
- Don't ask about price or budget (that's handled separately).
- Don't repeat information already in the query.
- If the query already specifies a detail (e.g. "32GB RAM laptop"), don't ask about that detail.
- Focus on the most important differentiating factors for that product category.
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
      .slice(0, 4);

    if (questions.length === 0) {
      return NextResponse.json(
        { success: false, error: err.failed },
        { status: 500 },
      );
    }

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
