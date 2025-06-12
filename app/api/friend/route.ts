// Edge API route – scrapes the public friend board HTML and returns a safe mirror
// Upstream pages: https://dissoku.net/ja/friend/users?page=1 …

// @ts-expect-error Next types are provided at runtime by Vercel
import { NextRequest, NextResponse } from 'next/server';
// @ts-expect-error Cheerio type definitions are bundled
import * as cheerio from 'cheerio';

export const runtime = 'edge';

/** How many pages to fetch from the upstream board. */
const PAGES_TO_FETCH = 2;
/** Words that mark a profile as NSFW and therefore blocked. */
const BANNED_KEYWORDS = [
  '18+',
  '18歳',
  '18才',
  'r18',
  'エロ',
  'えち',
  'えっち',
  'sex',
  'nsfw',
  'エロイプ',
];

interface SafeCard {
  name: string;
  intro: string;
  link: string;
  tags: string[];
  gender: 'female' | 'male' | 'unspecified';
}

export async function GET(_req: NextRequest) {
  const debug: string[] = [];
  const safeCards: SafeCard[] = [];
  let removed = 0;

  try {
    // Attempt to scrape HTML first. If Cloudflare returns a stub (no anchors), we fall back to JSON.
    let safeCardCount = 0;
    for (let page = 1; page <= PAGES_TO_FETCH; page++) {
      const url = `https://dissoku.net/ja/friend/users?page=${page}`;
      debug.push(`Fetching page ${page}: ${url}`);
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DissokuSafe/1.0; +https://github.com/junkim0/dissoku-safe)",
          "Accept-Language": "ja,en;q=0.9",
          "Accept-Encoding": "gzip, deflate",
          Referer: "https://dissoku.net/ja/friend",
        },
        cache: "no-store",
      });
      debug.push(`Page ${page} status: ${res.status}`);
      if (!res.ok) continue;
      const html = await res.text();
      if (page === 1) debug.push(`Initial HTML length received: ${html.length} characters`);

      const $ = cheerio.load(html);
      const anchors = $('a[href^="/ja/friend/user/"]');
      debug.push(`Profile anchors found on page ${page}: ${anchors.length}`);
      anchors.each((_, a) => extractCard($, a as cheerio.Element));
      safeCardCount += anchors.length;
    }

    // Fallback: use public JSON API if no anchors were found
    if (safeCardCount === 0) {
      debug.push("No anchors found – falling back to JSON endpoint");
      const apiUrl = "https://app.dissoku.net/api/userprofiles/?lang=ja&ordering=-upped_at&page=1";
      const res = await fetch(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DissokuSafe/1.0; +https://github.com/junkim0/dissoku-safe)",
          Accept: "application/json",
        },
        cache: "no-store",
      });
      debug.push(`JSON API status: ${res.status}`);
      if (res.ok) {
        const json = (await res.json()) as { results?: any[] };
        const profiles = json.results || [];
        debug.push(`Profiles received from JSON: ${profiles.length}`);
        profiles.forEach((p) => {
          safeCards.push({
            name: escapeHtml(p.username || p.global_name || "User"),
            intro: escapeHtml(p.comment || ""),
            link: "",
            tags: [],
            gender: 'unspecified',
          });
        });
      }
    }

    debug.push(`Total safe cards collected: ${safeCards.length}`);
    debug.push(`Cards removed by keyword filter: ${removed}`);

    const cardsHtml = safeCards
      .map((c) => {
        const color = c.gender === 'female' ? '#f9c5d1' : c.gender === 'male' ? '#a8c5ff' : '#b5e0c5';
        const tagBadges = c.tags
          .slice(0, 5)
          .map((t) => `<span style="background:#333;color:#fff;padding:2px 6px;border-radius:4px;margin-right:4px;font-size:12px;">${t}</span>`) // prettier-ignore
          .join('');
        return `<div style="background:${color};padding:12px;border-radius:8px;margin-bottom:12px;max-width:520px;">
  <h3 style="margin:0 0 6px 0;"><a href="${c.link}" target="_blank" rel="noopener noreferrer">${c.name}</a></h3>
  <div style="margin-bottom:6px;">${tagBadges}</div>
  <p style="margin:0;white-space:pre-wrap;">${c.intro}</p>
</div>`;
      })
      .join('\n');

    const htmlOut = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dissoku Safe Mirror</title></head><body style="font-family:sans-serif;padding:20px;">\n<h1>Dissoku Safe Mirror</h1>\n<h2>Server-Side Debug Info</h2><pre>${debug.join('\n')}</pre><hr/>${cardsHtml}</body></html>`;

    return new NextResponse(htmlOut, {
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