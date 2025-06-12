// Edge API route – returns a safe mirror of the latest "Discord Friend Board" profiles
// Data source: public JSON endpoint – no HTML scraping to stay within Vercel Edge 1 MB limit.
// Last attempt: 2024-07-16

// @ts-expect-error Next types are injected by Vercel at runtime
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/** Words that mark a profile as NSFW and therefore blocked. */
const BANNED_KEYWORDS = [
  '18+',
  'r18',
  'エロ',
  'えち',
  'えっち',
  'nsfw',
  'エロイプ',
];

interface DissokuProfile {
  id: number;
  username?: string;
  global_name?: string;
  comment?: string;
  tags?: string[];
  gender?: 'female' | 'male' | 'unspecified'; // not in JSON yet – we treat as unspecified
}

interface SafeCard {
  name: string;
  intro: string;
  tags: string[];
}

/** HTML-escape helper. */
function esc(s: string = ''): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(_req: NextRequest) {
  const debug: string[] = [];
  let removed = 0;
  try {
    const apiUrl =
      'https://app.dissoku.net/api/userprofiles/?lang=ja&ordering=-upped_at&page=1';
    debug.push(`Fetching JSON: ${apiUrl}`);
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; DissokuSafe/1.0; +https://github.com/junkim0/dissoku-safe)',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    debug.push(`Upstream status: ${res.status}`);
    if (!res.ok) throw new Error(`Upstream returned ${res.status}`);

    const data = (await res.json()) as { results?: DissokuProfile[] };
    const profiles = data.results ?? [];
    debug.push(`Profiles received: ${profiles.length}`);

    const safeCards: SafeCard[] = [];

    profiles.forEach((p) => {
      const lower = `${p.username ?? ''} ${p.global_name ?? ''} ${p.comment ?? ''}`.toLowerCase();
      if (BANNED_KEYWORDS.some((k) => lower.includes(k))) {
        removed++;
        return;
      }
      safeCards.push({
        name: esc(p.username || p.global_name || 'User'),
        intro: esc(p.comment || ''),
        tags: (p.tags || []).slice(0, 5).map((t) => esc(String(t))),
      });
    });

    debug.push(`Profiles removed by keyword filter: ${removed}`);

    const cardsHtml = safeCards
      .map((c) => {
        const tagBadges = c.tags
          .map(
            (t) =>
              `<span style="background:#333;color:#fff;padding:2px 6px;border-radius:4px;margin-right:4px;font-size:12px;">${t}</span>`,
          )
          .join('');
        return `<div style="background:#b5e0c5;padding:12px;border-radius:8px;margin-bottom:12px;max-width:520px;">
  <h3 style="margin:0 0 6px 0;">${c.name}</h3>
  <div style="margin-bottom:6px;">${tagBadges}</div>
  <p style="margin:0;white-space:pre-wrap;">${c.intro}</p>
</div>`;
      })
      .join('\n');

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dissoku Safe Mirror</title></head><body style="font-family:sans-serif;padding:20px;"><h1>Dissoku Safe Mirror</h1><h2>Server-Side Debug Info</h2><pre>${debug.join('\n')}</pre><hr/>${cardsHtml}</body></html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    debug.push(`ERROR: ${err.message}`);
    return new NextResponse(`<pre>${debug.join('\n')}</pre>`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
} 