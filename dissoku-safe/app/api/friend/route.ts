export const runtime = 'edge';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(req: NextRequest) {
  try {
    const pageParam = req.nextUrl.searchParams.get('page') || '1';
    const page = Math.max(1, Math.min(50, parseInt(pageParam, 10) || 1));
    const upstream = `https://dissoku.net/ja/friend/users?page=${page}`;

    console.log('Fetching from upstream:', upstream);
    
    const response = await fetch(upstream, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`Upstream responded with status: ${response.status}`);
    }

    const html = await response.text();
    
    if (!html) {
      throw new Error('No content received from upstream');
    }

    console.log('Received HTML length:', html.length);

    const $ = cheerio.load(html);
    const banned = [
      'エロ', 'えろ', 'エロイプ', 'オナニー', '見せ合い',
      'オフパコ', 'r18', '18歳以上', 'えち', 'nsfw', '性欲'
    ];

    // Find all profile cards
    const profileCards = $('.friend-user-card');
    console.log('Found profile cards:', profileCards.length);

    // Check each profile card for banned content
    profileCards.each((_, card) => {
      const cardText = $(card).text().trim().toLowerCase();
      if (banned.some(keyword => cardText.includes(keyword))) {
        $(card).remove();
        console.log('Removed profile containing banned content');
      }
    });

    // Get the container element that holds all profiles
    const container = $('.friend-user-cards');
    if (!container.length) {
      console.log('Warning: Could not find friend-user-cards container');
    }

    // Extract necessary styles
    const styles = $('style, link[rel="stylesheet"]').toString();
    
    // Extract only the main content we need
    const mainContent = $('.friend-user-cards').toString();
    const pagination = $('.pagination').toString();

    // Combine the content
    const processedHtml = `
      ${styles}
      <div class="friend-content">
        ${mainContent}
        ${pagination}
      </div>
    `;

    console.log('Processed HTML length:', processedHtml.length);
    console.log('Remaining profile cards:', $('.friend-user-card').length);

    const res = new NextResponse(processedHtml);
    res.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.headers.set('Content-Type', 'text/html; charset=utf-8');
    return res;
  } catch (error: any) {
    console.error('Error in API route:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 