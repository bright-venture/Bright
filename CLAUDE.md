# Bright website

Static marketing site for Bright Service Company SARL (facility and support services, est. 2005), live at https://brightlb.com (Netlify; `www` redirects to the apex). Originally generated with Kimi. Plain HTML/CSS/JS with a Node build step; no framework.

## Workflow

- Edit files in `src/` (and photos/logos in `source/`), then `npm run build`. Commit the build output: Netlify publishes the repo root as-is and does not run a build.
- `npm run dev` builds, then serves at http://localhost:4321 (or the next free port). The preview config is `.claude/launch.json` (`bright-site`; it only serves, so build first).
- `npm run audit` runs Lighthouse (mobile + desktop) on all three pages; narrow it with e.g. `npm run audit -- ar mobile`. Target is 100 in every category. On this Windows machine headless Chrome occasionally stalls its compositor for ~1 to 2 s (seen mostly on `/el/`), giving a one-off 99; re-run or confirm on PageSpeed Insights.

## Layout

- `src/index.html`: page template. `data-t="key"` replaces an element's text, `data-alt` an image alt, `data-aria` adds an `aria-label`, `data-photo="real-70"` expands to responsive `src`/`srcset`/`width`/`height`. `<!--languages-->`, `<!--logos-->`, `<!--services-->`, `<!--filters-->`, `<!--gallery-->` and `{{head}}`/`{{script}}` are filled by the build. The English placeholder text in the template is not used; all copy comes from `content.js`.
- `src/content.js`: global `CONTENT` with `en`, `ar`, `el` locales (all text, `services`, `categories`, `photos`). The build fails if a key is missing in any locale.
- `src/style.css`: all styles, inlined into each page at build time. Brand tokens on `:root` (`--navy #071b33`, `--cyan #00b2d2`). RTL and Greek overrides at the end. Small teal labels use `#00758e` for contrast.
- `src/app.js`: gallery filters, lightbox, the video poster (set only when the video nears the viewport, since browsers fetch posters eagerly) and remembering the chosen language (inlined, minified). Everything else is prerendered.
- Header: below 760px the links collapse into a menu button (`.menu-toggle`, styles scoped to `html.js` so the links stay visible without JS).
- Gallery: 4 columns on desktop, 2 when a filter leaves two photos (`data-count`), so rows are always complete. Keep photo counts per category even.
- `scripts/build.mjs`: writes `index.html` (en), `ar/index.html`, `el/index.html`, `sitemap.xml`, `robots.txt` and `assets/` (photo sizes 480 to 1800 px, logos, favicons, OG image, fonts subset to the characters the site uses with hashed names). SEO head (canonical, hreflang, Open Graph, JSON-LD) is generated here; `SITE`, `LANGS`, `LOGOS` live at the top.
- `source/photos`, `source/logos`: original images. `source/video`: the company video (served as-is from `assets/video/`, already web-encoded H.264) and its poster. `source/unused`: photos not on the site.
- `netlify.toml`: cache and security headers, and 301s from the old `/?lang=ar|el` URLs.

## Conventions

- Never use em dashes in user-facing text (any language).
- Option buttons and tiles form even, complete grids, never ragged rows.
- When adding copy, add it to all three locales in `content.js`.
- Contact details are still awaiting confirmation from the client; do not invent any.
