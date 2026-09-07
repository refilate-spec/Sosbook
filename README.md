# NovaStore

Static, mobile-first digital discovery/storefront built with HTML5 + Vanilla ES6 + Tailwind CDN.

## Files

- `index.html` — shell, Tailwind config, meta base
- `data.js` — centralized catalog/categories
- `app.js` — SPA routing, UI, search, saved/liked/recent, sharing, SEO/JSON-LD
- `styles.css` — glassmorphism and motion layer
- `manifest.json`, `robots.txt`, `sitemap.xml`
- `_headers`, `_redirects` — Cloudflare Pages/Workers friendly deployment helpers

## Deploy

Push the contents of this directory to GitHub and connect the repository to Cloudflare Pages as a static site. No build command is required.

## Production notes

1. Replace `https://example.com` in `data.js`, `robots.txt`, and `sitemap.xml` with the real domain.
2. Replace demo/external catalog links with your verified affiliate/provider URLs.
3. Review financial product copy and current fees/rates before publishing.
4. For best SEO, generate pre-rendered category/product HTML pages later as a build step; this version is static-first and dynamically updates meta/JSON-LD client-side.
