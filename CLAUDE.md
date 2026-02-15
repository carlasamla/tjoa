# CLAUDE.md — Project Guidelines

## Prompt Engineering Rules (Token Optimization)

All AI system prompts live in `app/api/*/route.ts`. When updating them, follow these rules:

### Keep prompts short
- Use terse, imperative language. The model understands concise instructions just as well.
- BAD: `"You must ALWAYS include a budget question as the SECOND TO LAST question. Use price ranges calibrated to the product category."`
- GOOD: `"Second-to-last: budget question with category-appropriate SEK ranges."`
- Never repeat a rule in both the system prompt AND user message. Say it once.

### Never duplicate context
- If a rule is in the system prompt, don't re-state it in the user message.
- The system prompt covers general behavior. The user message provides only the query-specific data (what to buy, budget, language).

### Use prompt caching
- All system prompts MUST use `cache_control: { type: "ephemeral" }` to enable Anthropic prompt caching.
- Pass system as an array of content blocks, not a string:
  ```ts
  system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }]
  ```
- This saves ~90% of input tokens on repeated requests within the 5-minute cache window.

### Set temperature: 0
- All routes return structured JSON. Use `temperature: 0` for deterministic, non-verbose output.

### Keep max_tokens tight
- Set `max_tokens` to the minimum needed for the response format:
  - Product recommend: 512 (one JSON object)
  - Guide questions: 300 (small JSON array)
  - Stock recommend: 400 (one JSON object)
- Don't pad "just in case" — it encourages verbose output.

### Keep retry/correction messages minimal
- When validation fails and we ask the model to retry, keep the correction prompt to one short sentence.
- BAD: `"WRONG: I searched for X which requires Y, but you recommended Z which is a W. These are completely different. Search again and find..."`
- GOOD: `"Wrong type: need Y, got W. Search again. Return corrected JSON."`

### Adding new rules to prompts
- Add as a single concise bullet/line, not a paragraph.
- If it's a conditional rule (only applies to certain queries), make that clear in one line.
- Example: `"CLOTHING/SHOES: First question MUST be size. Skip if size already in query."`

## API Route Architecture

- Model: `claude-haiku-4-5-20251001` on all routes (fast, cheap)
- Web search: `web_search_20250305` tool — max 3 uses per request
- Caching: In-memory `ResponseCache` with 5-10 min TTL
- Rate limiting: 5 req/min per IP
- Retry: Exponential backoff on 429/529 errors

## Dev Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npx tsc --noEmit --skipLibCheck  # Type check
```
