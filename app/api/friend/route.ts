// Edge API route - returns a safe mirror of the latest user cards on Dissoku
// Data source: public JSON endpoint (no scraping needed)

// @ts-expect-error Next provides these types at runtime
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface DissokuProfile {
  id: number;
  username: string;
  global_name?: string;
  comment?: string;
  avatar?: string; // URL path, not full URL
}

export async function GET(_req: NextRequest) {
  const debug: string[] = [];
  try {
    debug.push('Fetching JSON…');
    const res = await fetch('https://dissoku.net/api/userprofiles/?ordering=-upped_at&page=1', {
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; DissokuSafe/1.0; +https://github.com/junkim0/dissoku-safe)',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    });
    debug.push(`Upstream status: ${res.status}`);

    if (!res.ok) throw new Error(`Upstream returned HTTP ${res.status}`);

    const json = await res.json();
    const results: DissokuProfile[] = json.results ?? [];
    debug.push(`Profiles received: ${results.length}`);

    // Build very simple HTML cards
    const cardsHtml = results
      .map((p) => {
        const name = p.global_name || p.username || `User ${p.id}`;
        const link = `https://dissoku.net/ja/friend/user/${p.id}`;
        const avatarUrl = p.avatar ? `https://dissoku.net${p.avatar}` : undefined;
        return `
          <div class="profile-card">
            ${avatarUrl ? `<img src="${avatarUrl}" alt="${name}" width="64" height="64">` : ''}
            <h3><a href="${link}" target="_blank" rel="noopener noreferrer">${name}</a></h3>
            ${p.comment ? `<p>${p.comment}</p>` : ''}
          </div>`;
      })
      .join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dissoku Safe Mirror</title>
  <style>
    body{font-family:sans-serif;margin:20px;}
    .profile-card{border:1px solid #ccc;padding:10px;border-radius:6px;margin-bottom:10px;max-width:500px;}
    img{border-radius:4px;vertical-align:middle;margin-right:8px;}
  </style>
</head>
<body>
  <h1>Dissoku Safe Mirror</h1>
  <h2>Server-Side Debug</h2>
  <pre>${debug.join('\n')}</pre>
  <hr>
  ${cardsHtml}
</body>
</html>`;

    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
  } catch (err: any) {
    debug.push(`Error: ${err.message}`);
    return new NextResponse(
      `<pre>${debug.join('\n')}</pre>`,
      { status: 500, headers: { 'Content-Type': 'text/plain' } },
    );
  }
} 