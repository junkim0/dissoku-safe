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

    // Get the container element that holds all profiles
    const container = $('.friend-user-cards');
    if (!container.length) {
      log('Warning: Could not find friend-user-cards container');
    }

    // Extract necessary styles
    const styles = $('style, link[rel="stylesheet"]');
    log(`Found ${styles.length} style elements`);
    
    // Extract only the main content we need
    const mainContent = $('.friend-user-cards');
    const pagination = $('.pagination');
    
    log(`Main content length: ${mainContent.html()?.length || 0}`);
    log(`Pagination content length: ${pagination.html()?.length || 0}`);

    // Combine the content with necessary structure
    const processedHtml = `
      <div class="dissoku-mirror-content">
        <style>
          .dissoku-mirror-content {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
          }
          .friend-user-cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1rem;
            padding: 1rem;
          }
          .friend-user-card {
            background: white;
            border-radius: 8px;
            padding: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
        </style>
        ${styles.toString()}
        ${mainContent.toString()}
        ${pagination.toString()}
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