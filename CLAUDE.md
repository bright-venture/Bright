# Bright website

Static marketing site for Bright Service Company SARL (facility and support services, est. 2005), live at https://brightlb.com (Netlify; `www` redirects to the apex). Design and copy come from Kimi/ChatGPT exports; this repo prerenders them. Plain HTML/CSS/JS with a Node build step; no framework.

## Workflow

- Edit files in `src/` (and photos/logos/video in `source/`), then `npm run build`. Commit the build output: Netlify publishes the repo root as-is and does not run a build.
- `npm run dev` builds, then serves at http://localhost:4321 (or the next free port). The preview config is `.claude/launch.json` (`bright-site`; it only serves, so build first).
- `npm run audit` runs Lighthouse (mobile + desktop) on every page in `sitemap.xml`; narrow it with language, device or page, e.g. `npm run audit -- ar mobile porter-services`. Target is 100 in every category. On this Windows machine headless Chrome occasionally stalls its compositor for ~1 to 2 s, giving a one-off 99; re-run or confirm on PageSpeed Insights.
- When a new Kimi export arrives: their `content.js` / `services-content.js` reintroduce wording we corrected. Merge only new or changed strings, keep ours otherwise, and re-check the Conventions below.

## Pages

- 15 pages: the homepage and four service pages in `en` (`/`), `ar` (`/ar/`) and `el` (`/el/`), e.g. `/porter-services/`, `/ar/porter-services/`. Maintenance has no page; its card and links go to https://be-rightbright.com/.
- Each page has canonical, hreflang, Open Graph (a share image cropped from its hero photo) and JSON-LD (Organization, WebPage, plus Service and BreadcrumbList on service pages).

## Layout

- `src/layout.html`: shared document shell (header with brand, menu button, nav, language links; footer). Nav links point to `#section` on the homepage and to `/<lang>/#section` from service pages.
- `src/home.html`: homepage sections. `data-t="key"` replaces an element's text, `data-alt` an image alt, `data-aria` adds an `aria-label`, `data-photo="name"` expands to a responsive image. `<!--logos-->`, `<!--serviceCards-->`, `<!--values-->`, `<!--steps-->`, `<!--homePhotos-->` are filled by the build. Placeholder English text in templates is not used.
- `src/content.js`: `CONTENT` per locale (homepage text, service cards, values, steps, shared labels). `src/services-content.js`: `SERVICE_CONTENT` per locale (one entry per service page; an `externalUrl` entry gets no page). The build fails if a key is missing.
- `src/style.css`: Kimi's stylesheet, inlined at build time. Tokens on `:root` (`--navy #0b2038`, `--blue #006bd6`, `--cyan #36c7ff`). Latin and Greek use Arial; Arabic pages switch `--font` to the self-hosted Noto Sans Arabic. Our additions are marked with comments at the end (complete card rows).
- `src/app.js`: phone menu (below 680px, `.navigation.open`; styles scoped to `html.js` so links stay visible without JS), remembering the chosen language, and the video poster (set only near the viewport, since browsers fetch posters eagerly).
- `scripts/build.mjs`: renders all pages; photos to 480/640/800/1200/original px WebP, share images, logos, icons, the Arabic font subset, the video. Photos, share images, video and font files have content-hashed names (cached for a year via `netlify.toml`). `SITE`, `LANGS`, `LOGOS`, `HOME_PHOTOS`, `SIZES` live at the top.
- `source/photos`, `source/logos`, `source/video`: originals. `source/unused`: photos not on the site (old gallery, maintenance photos).

## Conventions

- Never use em dashes in user-facing text (any language).
- Option buttons and tiles form even, complete grids, never ragged rows (the five service cards are 3 + 2 on desktop, 1 + 2 + 2 on tablet).
- When adding copy, add it to all three locales.
- Arabic: Western digits, "شركة برايت للخدمات ش.م.م." for the legal name, plural address (أعمالكم), porter service is "مساعدة المتسوقين" (never حمّال).
- Greek: sentence case for titles, porter service is "μεταφοράς αγορών" (never αχθοφόρος), motto "Χαρά μας να σας βοηθάμε".
- Contact details are still awaiting confirmation from the client; do not invent any.
