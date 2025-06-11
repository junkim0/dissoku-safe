# Dissoku Safe

A free, open-source mirror of the public "Discord フレンド募集" board on https://dissoku.net/ja/friend that automatically hides NSFW / 18+ listings.

## Features

* Server-side proxy fetches the original HTML (up to the first 50 pages).
* Applies a keyword blacklist before streaming the page to visitors.
* Deployed for free on Vercel – edge-cached for 5 minutes to avoid stressing the upstream site.
* Zero tracking, zero ads. 100 % client-side privacy.

## Local development

```bash
# from repo root
cd dissoku-safe      # Next.js project lives here
npm i                # install deps
npm run dev          # http://localhost:3000
```

## Deployment

1. Push to the `main` branch – Vercel auto-builds.
2. Or run `vercel --prod` manually.

## Roadmap

- [ ] UI pagination (page 1-50 selector)
- [ ] Custom keyword list
