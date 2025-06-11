export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import cheerio from 'cheerio';

export async function GET(req: NextRequest) {
  const upstream = 'https://dissoku.net/ja/friend';
  const html = await fetch(upstream, {
    headers: {
      'user-agent': 'DissokuSafeBot/0.2 (+github.com/junkim0/dissoku-safe)'
    }
  }).then(r => r.text());

  const $ = cheerio.load(html);

  const banned = [
    'エロ', 'えろ', 'エロイプ', 'オナニー', '見せ合い',
    'オフパコ', 'R18', '18歳以上', 'えち', 'nsfw', '性欲'
  ];

  // remove any element that contains banned keyword text
  $('body *').each((_: number, el: cheerio.Element) => {
    const text = $(el).text();
    if (!text) return;
    if (banned.some(k => text.toLowerCase().includes(k.toLowerCase()))) {
      $(el).remove();
    }
  });

  const res = new NextResponse($.html());
  res.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate');
  res.headers.set('Content-Type', 'text/html; charset=utf-8');
  return res;
} 