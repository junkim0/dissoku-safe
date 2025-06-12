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
    for (let page = 1; page <= PAGES_TO_FETCH; page++) {
      const url = `https://dissoku.net/ja/friend/users?page=${page}`;
      debug.push(`Fetching page ${page}: ${url}`);

      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; DissokuSafe/1.0; +https://github.com/junkim0/dissoku-safe)',
          // Brotli decompression is flaky in edge runtime; ask for gzip instead.
          'Accept-Encoding': 'gzip, deflate',
          'Accept-Language': 'ja,en;q=0.9',
          Accept: 'text/html',
          Referer: 'https://dissoku.net/ja/friend',
        },
      });

      debug.push(`Status: ${res.status}`);
      if (!res.ok) {
        debug.push(`▲ Skipped page due to HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      debug.push(`Received – length ${html.length}`);

      const $ = cheerio.load(html);

      // Each card is an <a> that links to /ja/friend/user/<id>
      const anchors = $('a[href^="/ja/friend/user/"]');
      debug.push(`Anchors found on page ${page}: ${anchors.length}`);

      anchors.each((_i, el) => {
        const anchor = $(el);
        const linkPath = anchor.attr('href');
        if (!linkPath) return;

        const link = `https://dissoku.net${linkPath}`;
        // Prevent duplicates when the same card appears on page 1 & 2
        if (safeCards.some((c) => c.link === link)) return;

        // Username is usually in a child element that contains no whitespace
        const nameText = anchor.find('h2, h3, div, span').first().text().trim() || anchor.text().trim();

        // Intro paragraph appears as plain text somewhere inside the anchor – grab first <p>
        const intro = anchor.find('p').first().text().trim();

        // Tags are small <span> elements inside the card
        const tags: string[] = [];
        anchor.find('span').each((_j, tagEl) => {
          const t = $(tagEl).text().trim();
          if (t) tags.push(t);
        });

        // Determine gender by background color classes (approximate)
        const bgClass = anchor.attr('class') ?? '';
        let gender: SafeCard['gender'] = 'unspecified';
        if (bgClass.includes('bg-pink') || bgClass.includes('bg-red')) gender = 'female';
        else if (bgClass.includes('bg-blue')) gender = 'male';

        const haystack = `${nameText} ${intro} ${tags.join(' ')}`.toLowerCase();
        if (BANNED_KEYWORDS.some((kw) => haystack.includes(kw))) {
          removed++;
          return; // skip NSFW card
        }

        safeCards.push({ name: nameText, intro, link, tags, gender });
      });
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