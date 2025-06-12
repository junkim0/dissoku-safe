// @ts-expect-error Next.js provides its own type definitions at runtime
import { NextRequest, NextResponse } from 'next/server';
// @ts-expect-error Cheerio includes its own type definitions
import * as cheerio from 'cheerio';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  // Collect debug messages to render in the returned HTML
  const debugInfo: string[] = [];
  try {
    debugInfo.push('Starting to fetch data...');
    const response = await fetch('https://dissoku.net/ja/accounts/friend', {
      cache: 'no-store',
    });
    debugInfo.push(`Response status: ${response.status}`);
    const html = await response.text();
    debugInfo.push(`Received content length: ${html.length}`);

    const $ = cheerio.load(html);
    const profileCards = $('a[href^="/ja/friend/user/"]');
    debugInfo.push(`Profile cards found on page: ${profileCards.length}`);

    const cardHtmls: string[] = [];
    profileCards.each((i, el) => {
      // Create a new Cheerio instance for each card to preserve the outer HTML
      const cardCheerio = cheerio.load($.html(el), null, false);
      cardHtmls.push(cardCheerio.html());
    });

    const combinedHtml = cardHtmls.join('');
    const finalHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dissoku Safe Mirror</title>
        <style>
          body { font-family: sans-serif; }
          .profile-card { border: 1px solid #ccc; padding: 10px; margin: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>Dissoku Safe Mirror</h1>
        <div>
          <h2>Server-Side Debug Info:</h2>
          <pre>${debugInfo.join('\n')}</pre>
        </div>
        <hr>
        ${combinedHtml}
      </body>
      </html>
    `;

    return new NextResponse(finalHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error: any) {
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error - Dissoku Safe Mirror</title>
      </head>
      <body>
        <h1>An error occurred</h1>
        <p>${error.message}</p>
        <h2>Debug Info:</h2>
        <pre>${debugInfo.join('\n')}</pre>
      </body>
      </html>
    `;
    return new NextResponse(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
} 