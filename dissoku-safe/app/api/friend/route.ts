export const runtime = 'edge';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(req: NextRequest) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    const pageParam = req.nextUrl.searchParams.get('page') || '1';
    const page = Math.max(1, Math.min(50, parseInt(pageParam, 10) || 1));
    const upstream = `https://dissoku.net/ja/friend/users?page=${page}`;

    log(`Fetching from upstream: ${upstream}`);
    
    const response = await fetch(upstream, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9'
      }
    });

    log(`Upstream response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`Upstream responded with status: ${response.status}`);
    }

    const html = await response.text();
    
    if (!html) {
      throw new Error('No content received from upstream');
    }

    log(`Received HTML length: ${html.length}`);

    const $ = cheerio.load(html);
    const banned = [
      'エロ', 'えろ', 'エロイプ', 'オナニー', '見せ合い',
      'オフパコ', 'r18', '18歳以上', 'えち', 'nsfw', '性欲'
    ];

    // Find all profile cards
    const profileCards = $('.friend-user-card');
    log(`Found profile cards: ${profileCards.length}`);

    // Check each profile card for banned content
    let removedCount = 0;
    profileCards.each((_, card) => {
      const cardText = $(card).text().trim().toLowerCase();
      if (banned.some(keyword => cardText.includes(keyword))) {
        $(card).remove();
        removedCount++;
      }
    });
    log(`Removed ${removedCount} profiles containing banned content`);

    const remainingCards = $('.friend-user-card').length;
    log(`Remaining profile cards: ${remainingCards}`);

    // Create a simple debug message instead of the full HTML
    const processedHtml = `
      <div>
        <h2>Server-Side Debug Info:</h2>
        <p>Status of fetch from dissoku.net: ${response.status}</p>
        <p>Initial HTML length received: ${html.length} characters</p>
        <p>Profile cards found on page: ${profileCards.length}</p>
        <p>Profile cards removed: ${removedCount}</p>
        <p>Profile cards remaining: ${remainingCards}</p>
      </div>
    `;
    
    log(`Final processed HTML length: ${processedHtml.length}`);

    const res = new NextResponse(processedHtml);
    res.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.headers.set('Content-Type', 'text/html; charset=utf-8');
    return res;
  } catch (error: any) {
    log(`Error in API route: ${error.message}`);
    return new NextResponse(
      JSON.stringify({ 
        error: error.message || 'Internal Server Error',
        logs 
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 