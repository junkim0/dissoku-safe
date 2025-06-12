# Dissoku Safe

A free, open-source mirror of the public "Discord Friend Board" at https://dissoku.net/ja/friend. The proxy strips out any NSFW / 18+ listings so you can browse safely at work.

## Features

* Server-side proxy (Edge Function) fetches the upstream HTML.
* Scrapes the paginated board HTML (`/ja/friend/users?page=N`) directly – no login required.
* Requests gzip (not brotli) to avoid decompression issues on the Edge runtime.
* Applies a keyword blacklist before streaming the sanitised page to the visitor.
* Deployed for free on Vercel – edge-cached for five minutes to avoid stressing the upstream site.
* Zero tracking, zero ads. 100 % client-side privacy.

## Local development

```bash
# from repo root
npm install    # install dependencies
npm run dev    # http://localhost:3000
```

## Deployment

1. Push to the `main` branch – Vercel auto-builds.
2. Or run `vercel --prod` manually.

## Roadmap

- [ ] UI pagination (page 1-50 selector)
- [ ] Customisable keyword list
- [ ] Unit tests for the scraper
