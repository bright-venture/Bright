# Bright website

Static marketing site for Bright Service Company SARL (facility and support services, est. 2005). Originally generated with Kimi; no build step, no framework, no dependencies.

## Run

`npm run dev` serves the folder at http://localhost:4321, or the next free port if that one is busy (zero-dependency Node server in `scripts/serve.mjs`). The preview config is `.claude/launch.json` (`bright-site`). Opening `index.html` directly also works.

## Layout

- `index.html`: page structure. Translatable elements carry `data-t="key"`; translatable image alts carry `data-alt="key"`.
- `content.js`: global `CONTENT` object with `en`, `ar`, `el` locales. Every `data-t` / `data-alt` key must exist in all three. Also holds per-locale `services` (accordion), `categories` (gallery filters) and `photos` (gallery).
- `app.js`: language switching (persists to `localStorage` and `?lang=`), Arabic sets `dir="rtl"`, client logo marquee (`LOGOS` list), services accordion, gallery filters and lightbox.
- `style.css`: all styles, minified single file. Brand tokens on `:root` (`--navy #071b33`, `--cyan #00b2d2`). RTL and Greek overrides at the end.
- `assets/`: `real-*.webp` are the photos in use; client logos are `*.png`; `bright.png` is the logo and favicon. `photo-*.webp` are currently unused.

## Conventions

- Never use em dashes in user-facing text (any language).
- Option buttons and tiles form even, complete grids, never ragged rows.
- When adding copy, add it to all three locales in `content.js`.
- Contact details are still awaiting confirmation from the client; do not invent any.
