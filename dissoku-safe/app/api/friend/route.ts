export const runtime = 'edge';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const banned = [
  'エロ', 'えろ', 'エロイプ', 'オナニー', '見せ合い',
  'オフパコ', 'R18', '18歳以上', 'えち', 'nsfw', '性欲'
].map(k => k.toLowerCase());

export async function GET(req: NextRequest) {
  const upstream = 'https://dissoku.net/ja/friend';
  const html = await fetch(upstream, {
    headers: {
      'user-agent': 'DissokuSafeBot/0.1 (+github.com/junkim0/dissoku-safe)'
    }
  }).then(r => r.text());

  const parts = html.split('<div class="friend-card"');
  let clean = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const chunk = '<div class="friend-card"' + parts[i];
    const lower = chunk.toLowerCase();
    if (banned.some(k => lower.includes(k))) continue;
    clean += chunk;
  }

  const res = new NextResponse(clean);
  res.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate');
  res.headers.set('Content-Type', 'text/html; charset=utf-8');
  return res;
} 