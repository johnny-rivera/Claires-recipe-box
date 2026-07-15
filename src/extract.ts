import { Recipe } from './types';

/**
 * Try to pull the post caption/title via public oEmbed endpoints.
 * TikTok and YouTube have open oEmbed; Instagram requires an app token,
 * so for IG the user pastes the caption manually (prototype limitation).
 */
export async function fetchCaption(url: string): Promise<string | null> {
  try {
    let oembed: string | null = null;
    if (/tiktok\.com/i.test(url)) {
      oembed = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    } else if (/youtube\.com|youtu\.be/i.test(url)) {
      oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    }
    if (!oembed) return null;
    const res = await fetch(oembed);
    if (!res.ok) return null;
    const j = await res.json();
    return (j.title as string) ?? null;
  } catch {
    return null;
  }
}

/**
 * Send caption text to the Claude API and get a structured recipe back.
 * Prototype: API key lives on-device. In production, proxy this through
 * your own backend so the key is never shipped in the app.
 */
export async function extractRecipe(
  text: string,
  apiKey: string,
  source: string,
): Promise<Recipe> {
  const prompt =
    'Extract the recipe from this social media post. Reply with ONLY valid JSON, no markdown fences:\n' +
    '{"name": string, "cuisine": "Italian"|"Mexican"|"Asian"|"Comfort"|"Healthy"|"Other", ' +
    '"ingredients": string[] (lowercase canonical names, no quantities, e.g. "garlic" not "2 cloves of garlic"), ' +
    '"quantities": string[] (same order as ingredients, e.g. "2 cloves", "" if unknown), ' +
    '"steps": string[] (short imperative steps, [] if not stated)}\n\n' +
    'If the post contains no recipe, reply with {"error": "no recipe found"}.\n\nPost:\n' + text;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error ${res.status}`);
  const j = await res.json();
  const raw: string = j.content?.[0]?.text ?? '';
  const match = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : raw);
  if (parsed.error) throw new Error(parsed.error);

  return {
    id: 'r' + Date.now(),
    name: parsed.name,
    cuisine: parsed.cuisine ?? 'Other',
    source,
    ingredients: (parsed.ingredients ?? []).map((x: string) => x.toLowerCase().trim()),
    quantities: parsed.quantities ?? [],
    steps: parsed.steps ?? [],
  };
}
