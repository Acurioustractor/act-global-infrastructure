/**
 * Gemini Web Search Source Plugin
 *
 * Like-for-like replacement for the Anthropic web-search plugin: Gemini's
 * server-side `googleSearch` grounding tool finds real, currently open grants
 * in a single search+extract call. Built 2026-06-07 when the Anthropic key ran
 * dry — the GEMINI_API_KEY is funded (daily OCR) and grounding has a free
 * daily allowance.
 *
 * The Anthropic plugin (web-search.ts) remains registered for explicit
 * `--sources web-search` use once credits return; this one is in the default
 * source list in its place.
 */

// Resolved from the root workspace dependency (@google/genai ^1.45.0 in the
// repo root package.json) — intentionally not added to this package's deps to
// keep the lockfile untouched.
import { GoogleGenAI } from '@google/genai';
import type { SourcePlugin, DiscoveryQuery, RawGrant } from '../types.ts';

interface GeminiSearchConfig {
  model?: string;
  requestDelayMs?: number;
  searchQueries?: Array<{ name: string; query: string }>;
}

// Same coverage as web-search.ts DEFAULT_AU_QUERIES — keep the two in sync.
const DEFAULT_AU_QUERIES = [
  { name: 'Federal Indigenous Grants', query: 'site:grants.gov.au OR site:niaa.gov.au Indigenous First Nations grants open Queensland' },
  { name: 'QLD Government Grants', query: 'site:qld.gov.au grants open applications community NFP not-for-profit' },
  { name: 'Arts Grants Australia', query: 'site:arts.qld.gov.au OR site:australiacouncil.gov.au grants open First Nations arts community' },
  { name: 'Foundation Grants', query: 'Australia foundation grants open Indigenous community social enterprise Queensland NFP' },
  { name: 'Environment & Land Grants', query: 'Australia grants open regenerative agriculture environment Indigenous land management Queensland' },
  { name: 'Social Enterprise Grants', query: 'Australia social enterprise grants circular economy community development Indigenous' },
  { name: 'Justice Innovation Grants', query: 'Australia youth justice innovation grants First Nations community-led' },
];

// Tolerant parse for LLM JSON: control chars → spaces, fences stripped, whole-array
// parse first, then per-object salvage (grant objects are flat — no nested braces)
// so one malformed object drops alone instead of killing the query's whole batch.
function parseGrantArray(raw: string): Array<Record<string, unknown>> {
  const cleaned = raw.replace(/[\u0000-\u001F]+/g, ' ').replace(/```(?:json)?/gi, '');
  const arr = cleaned.match(/\[[\s\S]*\]/);
  if (arr) {
    try { return JSON.parse(arr[0]) as Array<Record<string, unknown>>; } catch { /* salvage below */ }
  }
  const out: Array<Record<string, unknown>> = [];
  for (const m of cleaned.matchAll(/\{[^{}]*\}/g)) {
    try { out.push(JSON.parse(m[0]) as Record<string, unknown>); } catch { /* skip bad object */ }
  }
  return out;
}

function buildSearchPrompt(searchQuery: string, query: DiscoveryQuery): string {
  const year = new Date().getFullYear();
  const geo = query.geography?.join(', ') || 'Australia';
  const cats = query.categories?.join(', ') || 'community, arts, indigenous, environment, social enterprise';

  return `Search for currently open grant opportunities: "${searchQuery}"

Find grants that are CURRENTLY OPEN for applications in ${year}. Focus on:
- Grants in: ${geo}
- Categories: ${cats}
${query.keywords?.length ? `- Keywords: ${query.keywords.join(', ')}` : ''}

For each grant found, extract:
- Exact name
- Provider/funder
- Amount range
- Closing date
- Application URL (MUST be a real, working URL you found via search)
- Brief description

Return ONLY a JSON array (no markdown, no explanation):
[{
  "name": "Grant Name",
  "provider": "Funder Name",
  "program": "Program stream if applicable",
  "amountMin": null,
  "amountMax": 50000,
  "closesAt": "${year}-06-30",
  "url": "https://real-url-found-in-search.gov.au/...",
  "description": "What it funds",
  "categories": ["indigenous", "community"]
}]

Rules:
- ONLY include grants you verified are currently open via web search
- Every grant MUST have a real URL (not hallucinated)
- Use null for unknown amounts
- Return [] if no current grants found`;
}

export function createGeminiSearchPlugin(config: GeminiSearchConfig = {}): SourcePlugin {
  const model = config.model || 'gemini-2.5-flash';
  const delayMs = config.requestDelayMs || 1000;
  let lastRequest = 0;

  async function rateLimit() {
    const elapsed = Date.now() - lastRequest;
    if (elapsed < delayMs) {
      await new Promise(r => setTimeout(r, delayMs - elapsed));
    }
    lastRequest = Date.now();
  }

  return {
    id: 'gemini-search',
    name: 'Gemini Grounded Search',
    type: 'ai_search',
    geography: ['AU'],

    async *discover(query: DiscoveryQuery): AsyncGenerator<RawGrant> {
      if (!process.env.GEMINI_API_KEY) {
        console.error('[gemini-search] GEMINI_API_KEY not set — skipping');
        return;
      }
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const searches = config.searchQueries || DEFAULT_AU_QUERIES;
      const customSearches = [...searches];
      if (query.keywords?.length) {
        customSearches.push({
          name: 'Custom Search',
          query: query.keywords.join(' ') + ' grants open Australia',
        });
      }

      for (const search of customSearches) {
        await rateLimit();

        try {
          // 503 UNAVAILABLE ("high demand") is common and transient on
          // grounded flash — retry with backoff, then fall back to flash-lite
          // (also grounding-capable, less saturated).
          const attempts = [
            { model, delay: 0 },
            { model, delay: 3000 },
            { model: 'gemini-2.5-flash-lite', delay: 2000 },
          ];
          let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
          let lastErr: unknown = null;
          for (const attempt of attempts) {
            if (attempt.delay) await new Promise(r => setTimeout(r, attempt.delay));
            try {
              response = await ai.models.generateContent({
                model: attempt.model,
                contents: buildSearchPrompt(search.query, query),
                config: {
                  tools: [{ googleSearch: {} }],
                  maxOutputTokens: 4000,
                },
              });
              break;
            } catch (err) {
              lastErr = err;
              const msg = err instanceof Error ? err.message : String(err);
              if (!/503|UNAVAILABLE|high demand|overloaded/i.test(msg)) throw err;
            }
          }
          if (!response) throw lastErr;

          const text = response.text || '';
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (!jsonMatch) continue;

          const grants = parseGrantArray(jsonMatch[0]);

          for (const g of grants) {
            if (!g.name || !g.url) continue;
            yield {
              title: g.name as string,
              provider: (g.provider as string) || search.name,
              sourceUrl: g.url as string,
              amount: {
                min: (g.amountMin as number) || undefined,
                max: (g.amountMax as number) || undefined,
              },
              deadline: (g.closesAt as string) || undefined,
              description: (g.description as string) || undefined,
              categories: (g.categories as string[]) || [],
              program: (g.program as string) || undefined,
              sourceId: 'gemini-search',
            };
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[gemini-search] Error searching "${search.name}": ${msg}`);
        }
      }
    },
  };
}
