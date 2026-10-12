// Builds the static site from src/ into site/, the only folder Netlify publishes:
// the homepage and every service page in each language (/, /ar/, /el/, /porter-services/, /ar/porter-services/ ...),
// optimized images, the Arabic font, the video, robots.txt and sitemap.xml.
// Run: npm run build
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { transform } from 'esbuild';
import subsetFont from 'subset-font';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const at = (...parts) => join(root, ...parts);
// Netlify publishes only this folder, so sources and tooling never become public.
const OUT = 'site';
const out = (...parts) => join(root, OUT, ...parts);

const SITE = 'https://brightlb.com';
const LANGS = {
  en: { path: '/', dir: 'ltr', locale: 'en_US', label: 'EN', preload: [] },
  ar: { path: '/ar/', dir: 'rtl', locale: 'ar_LB', label: 'عربي', preload: ['noto-sans-arabic-arabic'] },
  el: { path: '/el/', dir: 'ltr', locale: 'el_GR', label: 'ΕΛ', preload: [] },
};
const LOGOS = [['spinneys', 'Spinneys'], ['happy', 'Happy'], ['skygate', 'Sky Gate'], ['noknok', 'Noknok'], ['grabngo', 'Grab’n Go'], ['maliks', 'Maliks'], ['tawfeer', 'Tawfeer'], ['beirut-duty-free', 'Beirut Duty Free'], ['teska', 'Teska']];
const HOME_PHOTOS = ['cleaning-food-hygiene', 'warehouse-order-picking', 'porter-vehicle'];
const HOME_HERO = 'cleaning-mall';
// Contact details shown on the contact page, in the footer and in structured data.
// Phones in international format (Lebanese landlines drop the leading 0 after +961).
const CONTACT = {
  email: 'contact@brightlb.com',
  phones: ['+961 79 300 350', '+961 79 300 359', '+961 1 488 450'],
};
const tel = phone => 'tel:' + phone.replace(/[^\d+]/g, '');
const PHOTO_WIDTHS = [480, 640, 800, 1200];
// Rendered widths of each photo slot (layout widths come from style.css: 18px phone gutters, 1200px max content).
const SIZES = {
  hero: '(max-width: 680px) calc(100vw - 36px), (min-width: 1264px) 560px, 45vw',
  section: '(max-width: 680px) calc(100vw - 36px), (min-width: 1264px) 700px, 56vw',
  grid: '(max-width: 680px) calc(100vw - 36px), (min-width: 1264px) 387px, 31vw',
};
// Latin and Greek use the system Arial; only Arabic pages need a web font.
const FONTS = [['Noto Sans Arabic', 'noto-sans-arabic', ['noto-sans-arabic-arabic']]];

const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hashOf = data => createHash('sha256').update(data).digest('hex').slice(0, 8);
const pad = index => String(index + 1).padStart(2, '0');
const pagePath = (lang, slug) => LANGS[lang].path + (slug ? `${slug}/` : '');

async function isFresh(source, output) {
  try { return (await stat(output)).mtimeMs >= (await stat(source)).mtimeMs } catch { return false }
}

async function exists(path) {
  try { await stat(path); return true } catch { return false }
}

async function writeOut(path, content) {
  await mkdir(dirname(out(path)), { recursive: true });
  await writeFile(out(path), content);
}

// Deletes generated files in a folder that this build did not produce (old photos, old video versions).
async function prune(folder, keep) {
  await mkdir(out(folder), { recursive: true });
  for (const file of await readdir(out(folder))) if (!keep.has(file)) await rm(out(folder, file));
}

// Image variants are only regenerated when the source is newer than the output.
async function render(source, output, pipeline) {
  await mkdir(dirname(out(output)), { recursive: true });
  if (!(await isFresh(at(source), out(output)))) await pipeline(sharp(at(source))).toFile(out(output));
  return sharp(out(output)).metadata();
}

// Photo files are named after a hash of the original, so they can be cached for a year
// and a replaced photo gets a new URL.
async function buildPhotos(names) {
  const photos = {}, keep = new Set();
  for (const name of names) {
    const source = `source/photos/${name}.webp`;
    const hash = hashOf(await readFile(at(source)));
    const { width, height } = await sharp(at(source)).metadata();
    const widths = [...PHOTO_WIDTHS.filter(w => w < width), width];
    for (const w of widths) {
      const file = `${name}-${hash}-${w}.webp`;
      keep.add(file);
      if (!(await exists(out('assets/img', file)))) await render(source, `assets/img/${file}`, img => img.resize({ width: w }).webp({ quality: 70, effort: 6 }));
    }
    photos[name] = {
      width, height, source,
      src: `/assets/img/${name}-${hash}-${widths.find(w => w >= 800) ?? width}.webp`,
      srcset: widths.map(w => `/assets/img/${name}-${hash}-${w}.webp ${w}w`).join(', '),
    };
  }
  await prune('assets/img', keep);
  return photos;
}

// One share image per page, cropped from that page's hero photo.
async function buildShareImages(pages, photos) {
  const images = {}, keep = new Set();
  for (const { key, hero } of pages) {
    if (images[key]) continue;
    const file = `${key}-${photos[hero].src.match(/-([0-9a-f]{8})-/)[1]}.jpg`;
    keep.add(file);
    if (!(await exists(out('assets/og', file)))) await render(photos[hero].source, `assets/og/${file}`, img => img.resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 80, mozjpeg: true }));
    images[key] = `/assets/og/${file}`;
  }
  await prune('assets/og', keep);
  return images;
}

async function buildLogos() {
  const logos = {};
  for (const [file] of LOGOS) {
    const { width, height } = await render(`source/logos/${file}.png`, `assets/logos/${file}.webp`, img => img.resize({ height: 76 }).webp({ quality: 85, alphaQuality: 90, effort: 6 }));
    logos[file] = { width, height };
  }
  return logos;
}

async function buildBrand() {
  const source = 'source/logos/bright.png';
  const brand = await render(source, 'assets/brand/bright.webp', img => img.resize({ height: 164 }).webp({ quality: 78, alphaQuality: 85, effort: 6 }));
  await render(source, 'assets/brand/favicon-32.png', img => img.resize(32, 32, { fit: 'contain', background: '#0000' }).png());
  await render(source, 'assets/brand/bright-512.png', img => img.resize(512, 512, { fit: 'contain', background: '#0000' }).png());
  await render(source, 'assets/brand/apple-touch-icon.png', img => img.resize(140, 140, { fit: 'contain', background: '#fff' }).extend({ top: 20, bottom: 20, left: 20, right: 20, background: '#fff' }).flatten({ background: '#fff' }).png());
  return brand;
}

// The video is served as-is (H.264, index at the start so it streams); the poster becomes WebP.
// Both get hashed names so a new cut replaces the cached one immediately.
async function buildVideo() {
  const video = await readFile(at('source/video/bright-video.mp4'));
  const files = { src: `bright-video-${hashOf(video)}.mp4` };
  const poster = await readFile(at('source/video/bright-video-poster.jpg'));
  files.poster = `bright-video-poster-${hashOf(poster)}.webp`;
  if (!(await exists(out('assets/video', files.src)))) { await mkdir(out('assets/video'), { recursive: true }); await copyFile(at('source/video/bright-video.mp4'), out('assets/video', files.src)) }
  if (!(await exists(out('assets/video', files.poster)))) await render('source/video/bright-video-poster.jpg', `assets/video/${files.poster}`, img => img.webp({ quality: 70, effort: 6 }));
  await prune('assets/video', new Set(Object.values(files)));
  return { src: `/assets/video/${files.src}`, poster: `/assets/video/${files.poster}` };
}

// Fonts are cut down to the characters the site actually uses; shaping features such as
// Arabic joining forms are kept. File names carry a content hash so they can be cached forever.
async function buildFonts(text) {
  let css = '';
  const files = {};
  await rm(out('assets/fonts'), { recursive: true, force: true });
  await mkdir(out('assets/fonts'), { recursive: true });
  for (const [family, pkg, subsets] of FONTS) {
    const sourceCss = await readFile(at(`node_modules/@fontsource-variable/${pkg}/wght.css`), 'utf8');
    for (const file of subsets) {
      const block = sourceCss.match(new RegExp(`/\\* ${file}-wght-normal \\*/\\s*@font-face\\s*{([^}]*)}`));
      if (!block) throw new Error(`Font subset not found: ${file}`);
      const original = await readFile(at(`node_modules/@fontsource-variable/${pkg}/files/${file}-wght-normal.woff2`));
      const subset = await subsetFont(original, text, { targetFormat: 'woff2' });
      files[file] = `/assets/fonts/${file}-${hashOf(subset)}.woff2`;
      await writeFile(out(files[file].slice(1)), subset);
      const weight = block[1].match(/font-weight:\s*([^;]+);/)[1];
      const range = block[1].match(/unicode-range:\s*([^;]+);/)[1];
      css += `@font-face{font-family:'${family}';font-style:normal;font-display:swap;font-weight:${weight};src:url(${files[file]}) format('woff2');unicode-range:${range}}`;
    }
  }
  return { css, files };
}

function structuredData(lang, page, c, shareImage) {
  const url = `${SITE}${pagePath(lang, page.slug)}`;
  const organization = {
    '@type': 'Organization',
    '@id': `${SITE}/#organization`,
    name: 'Bright Service Company SARL',
    alternateName: 'Bright',
    url: `${SITE}/`,
    logo: `${SITE}/assets/brand/bright-512.png`,
    slogan: c.heroFoot,
    description: c.description,
    foundingDate: '2005',
    areaServed: { '@type': 'Country', name: 'Lebanon' },
    knowsAbout: c.services.map(service => service.title),
    email: CONTACT.email,
    telephone: CONTACT.phones[0],
    contactPoint: CONTACT.phones.map(phone => ({
      '@type': 'ContactPoint', telephone: phone, email: CONTACT.email, contactType: 'customer service',
      areaServed: 'LB', availableLanguage: ['English', 'Arabic', 'Greek'],
    })),
  };
  const graph = [organization, {
    '@type': page.key === 'contact' ? 'ContactPage' : 'WebPage',
    '@id': `${url}#webpage`,
    url, name: page.title, description: page.description, inLanguage: lang,
    isPartOf: { '@id': `${SITE}/#website` },
    primaryImageOfPage: `${SITE}${shareImage}`,
  }];
  if (!page.slug) {
    graph.push({ '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'Bright', inLanguage: Object.keys(LANGS), publisher: { '@id': `${SITE}/#organization` } });
  } else {
    if (page.service) graph.push({
      '@type': 'Service', '@id': `${url}#service`, name: page.service.title, description: page.service.intro, url,
      provider: { '@id': `${SITE}/#organization` }, areaServed: { '@type': 'Country', name: 'Lebanon' }, image: `${SITE}${shareImage}`,
    });
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Bright', item: `${SITE}${pagePath(lang)}` },
        { '@type': 'ListItem', position: 2, name: page.service ? page.service.title : c.navContact, item: url },
      ],
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

function head(lang, page, c, assets) {
  const url = `${SITE}${pagePath(lang, page.slug)}`;
  const shareImage = assets.shareImages[page.key];
  const alternates = Object.keys(LANGS).map(code => `<link rel="alternate" hreflang="${code}" href="${SITE}${pagePath(code, page.slug)}">`).join('')
    + `<link rel="alternate" hreflang="x-default" href="${SITE}${pagePath('en', page.slug)}">`;
  const otherLocales = Object.entries(LANGS).filter(([code]) => code !== lang).map(([, { locale }]) => `<meta property="og:locale:alternate" content="${locale}">`).join('');
  const preloads = LANGS[lang].preload.map(file => `<link rel="preload" href="${assets.fonts[file]}" as="font" type="font/woff2" crossorigin>`).join('');
  // The js class switches phones to the menu button before first paint; without JS the links stay visible.
  // Visitors who picked Arabic or Greek before land on their language; crawlers have no stored choice.
  const remember = `<script>document.documentElement.classList.add('js')${lang === 'en' ? ";try{var l=localStorage.getItem('bright-language');if(l==='ar'||l==='el')location.replace('/'+l+location.pathname+location.hash)}catch(e){}" : ''}</script>`;
  return [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}">`,
    `<meta name="theme-color" content="#0b2038">`,
    remember,
    `<link rel="canonical" href="${url}">`,
    alternates,
    preloads,
    `<link rel="icon" href="/assets/brand/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">`,
    `<meta property="og:type" content="website"><meta property="og:site_name" content="Bright"><meta property="og:url" content="${url}"><meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.description)}">`,
    `<meta property="og:image" content="${SITE}${shareImage}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(page.imageAlt)}">`,
    `<meta property="og:locale" content="${LANGS[lang].locale}">${otherLocales}`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<script type="application/ld+json">${JSON.stringify(structuredData(lang, page, c, shareImage)).replace(/</g, '\\u003c')}</script>`,
    `<style>${assets.css}</style>`,
  ].filter(Boolean).join('\n  ');
}

// The LCP hero decodes synchronously and loads first; everything else is lazy and decodes off the main thread.
function photo(assets, name, sizes, alt, { priority = false, className = '' } = {}) {
  const p = assets.photos[name];
  if (!p) throw new Error(`Photo not built: ${name}`);
  return `<img${className ? ` class="${className}"` : ''} src="${p.src}" srcset="${p.srcset}" sizes="${sizes}" width="${p.width}" height="${p.height}" alt="${esc(alt)}"`
    + (priority ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"') + '>';
}

const list = items => `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;

function homeMain(template, lang, c, services, assets) {
  const logoSet = hidden => `<div class="logo-set"${hidden ? ' aria-hidden="true"' : ''}>` + LOGOS.map(([file, name]) =>
    `<div class="client-logo"><img src="/assets/logos/${file}.webp" alt="${hidden ? '' : esc(name)}" width="${assets.logos[file].width}" height="${assets.logos[file].height}" loading="lazy" decoding="async"></div>`).join('') + '</div>';
  const cards = c.services.map((card, index) => {
    if (card.externalUrl) {
      return `<a class="service-card direct-service" href="${esc(card.externalUrl)}"><span class="service-number" dir="ltr">${pad(index)}</span><h3>${esc(card.title)}</h3><p>${esc(card.body)}</p><span class="service-detail-link">${esc(card.externalLabel)}</span></a>`;
    }
    if (!services.some(s => s.slug === card.slug)) throw new Error(`No service page for card "${card.slug}" in ${lang}`);
    return `<article class="service-card"><span class="service-number" dir="ltr">${pad(index)}</span><h3>${esc(card.title)}</h3><p>${esc(card.body)}</p>`
      + `<details name="bright-services"><summary>${esc(c.scopeLabel)}</summary>${list(card.items)}</details>`
      + `<a class="service-detail-link" href="${pagePath(lang, card.slug)}">${esc(c.serviceDetails)}</a></article>`;
  }).join('');
  const values = c.values.map(([title, text]) => `<article><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('');
  const steps = c.steps.map(([title, text], index) => `<article><span dir="ltr">${pad(index)}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('');
  const homePhotos = HOME_PHOTOS.map((name, index) =>
    `<figure>${photo(assets, name, SIZES.grid, c.homePhotoAlts[index])}<figcaption>${esc(c.homePhotoCaptions[index])}</figcaption></figure>`).join('');
  return template
    .replace('<!--logos-->', logoSet(false) + logoSet(true))
    .replace('<!--serviceCards-->', cards)
    .replace('<!--values-->', values)
    .replace('<!--steps-->', steps)
    .replace('<!--homePhotos-->', homePhotos)
    .replace('{{videoSrc}}', assets.video.src)
    .replace('{{videoPoster}}', assets.video.poster);
}

function serviceMain(lang, s, c, services, assets) {
  const home = pagePath(lang);
  const articles = s.sections.map((section, sectionIndex) => {
    // Corporate cleaning's first section lists its scope between the last two paragraphs (as designed).
    const inlineList = s.slug === 'corporate-cleaning' && sectionIndex === 0 && section.items?.length;
    const paragraphs = section.paragraphs.map((text, index) =>
      `<p>${esc(text)}</p>` + (inlineList && index === section.paragraphs.length - 2 ? list(section.items) : '')).join('');
    return `<article><h2>${esc(section.heading)}</h2>${paragraphs}`
      + (section.items?.length && !inlineList ? list(section.items) : '')
      + (section.image ? `<figure class="service-section-photo">${photo(assets, section.image.replace(/\.webp$/, ''), SIZES.section, section.alt)}<figcaption>${esc(section.caption)}</figcaption></figure>` : '')
      + '</article>';
  }).join('');
  const others = services.concat(c.services.filter(card => card.externalUrl).map(card => ({ ...card, external: true })))
    .filter((other, index, all) => other.slug !== s.slug && all.findIndex(x => x.slug === other.slug) === index);
  // Keep the homepage order for "other services"
  others.sort((a, b) => c.services.findIndex(x => x.slug === a.slug) - c.services.findIndex(x => x.slug === b.slug));
  const arrow = lang === 'ar' ? '←' : '→';
  const otherLinks = others.map(other => {
    const page = services.find(x => x.slug === other.slug);
    const title = page ? page.title : other.title;
    return `<a href="${esc(other.externalUrl || pagePath(lang, other.slug))}">${esc(title)}<span aria-hidden="true">${arrow}</span></a>`;
  }).join('');
  return `<section class="service-hero"><div><a class="service-back" href="${home}#services">${esc(c.backServices)}</a><p class="eyebrow">${esc(c.servicePageLabel)}</p><h1>${esc(s.title)}</h1>`
    + (s.slogan ? `<p class="service-slogan">${esc(s.slogan)}</p>` : '') + (s.subtitle ? `<p class="service-subtitle">${esc(s.subtitle)}</p>` : '')
    + `<p class="service-intro">${esc(s.intro)}</p></div><figure>${photo(assets, s.image.replace(/\.webp$/, ''), SIZES.hero, s.alt, { priority: true })}<figcaption>${esc(s.caption)}</figcaption></figure></section>`
    + `<section class="section service-detail"><div class="service-prose">${(s.pageIntro || []).map(text => `<p class="lead">${esc(text)}</p>`).join('')}${articles}</div>`
    + `<aside><div><h2>${esc(s.scopeTitle || c.scopeLabel)}</h2>${list(s.items)}</div><div><h2>${esc(c.benefitsLabel)}</h2>${list(s.benefits)}</div></aside></section>`
    + (s.gallery?.length ? `<section class="section service-photo-gallery"><h2>${esc(s.galleryTitle)}</h2><div class="service-photo-grid">${s.gallery.map(g => `<figure>${photo(assets, g.image.replace(/\.webp$/, ''), SIZES.grid, g.alt)}<figcaption>${esc(g.caption)}</figcaption></figure>`).join('')}</div></section>` : '')
    + `<section class="section other-services"><h2>${esc(c.otherServices)}</h2><div>${otherLinks}</div></section>`
    + `<section class="closing"><p class="eyebrow">${esc(c.sloganLabel)}</p><h2>${esc(c.serviceMotto)}</h2><p>${esc(c.closingBody)}</p><div class="hero-actions"><a class="button light" href="${home}#services">${esc(c.backServices)}</a><a class="button outline" href="${pagePath(lang, 'contact')}">${esc(c.contactAction)}</a></div></section>`;
}

function contactMain(lang, c) {
  const phones = CONTACT.phones.map(phone => `<li><a href="${tel(phone)}" dir="ltr">${esc(phone)}</a></li>`).join('');
  return `<section class="service-hero contact-hero"><div><p class="eyebrow">${esc(c.contactLabel)}</p><h1>${esc(c.contactTitle)}</h1><p class="service-slogan">${esc(c.serviceMotto)}</p><p class="service-intro">${esc(c.contactIntro)}</p></div></section>`
    + `<section class="section contact-details"><div class="contact-grid">`
    + `<article class="contact-card"><h2>${esc(c.contactPhoneTitle)}</h2><p>${esc(c.contactPhoneNote)}</p><ul class="contact-list">${phones}</ul></article>`
    + `<article class="contact-card"><h2>${esc(c.contactEmailTitle)}</h2><p>${esc(c.contactEmailNote)}</p><ul class="contact-list"><li><a href="mailto:${CONTACT.email}" dir="ltr">${CONTACT.email}</a></li></ul></article>`
    + `</div></section>`
    + `<section class="closing"><p class="eyebrow">${esc(c.sloganLabel)}</p><h2>${esc(c.serviceMotto)}</h2><p>${esc(c.closingBody)}</p><a class="button light" href="${pagePath(lang)}#services">${esc(c.backServices)}</a></section>`;
}

function renderPage(layout, lang, page, c, main, assets) {
  const t = key => {
    if (typeof c[key] !== 'string') throw new Error(`Missing "${key}" in ${lang} content`);
    return c[key];
  };
  const languages = Object.entries(LANGS).map(([code, { label }]) =>
    `<a href="${pagePath(code, page.slug)}" hreflang="${code}" lang="${code}"${code === lang ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return layout
    .replace('{{lang}}', lang)
    .replace('{{dir}}', LANGS[lang].dir)
    .replace('{{head}}', () => head(lang, page, c, assets))
    .replace('{{main}}', () => main)
    .replace('{{script}}', () => `<script>${assets.js}</script>`)
    .replace(/\{\{homePath\}\}/g, pagePath(lang))
    .replace(/\{\{contactPath\}\}/g, pagePath(lang, 'contact'))
    .replace('{{contactCurrent}}', page.key === 'contact' ? ' aria-current="page"' : '')
    .replace('<!--footerContact-->', `<a href="mailto:${CONTACT.email}" dir="ltr">${CONTACT.email}</a><a href="${tel(CONTACT.phones[0])}" dir="ltr">${esc(CONTACT.phones[0])}</a>`)
    // Section links stay on the page at home, and point back to the homepage from service pages.
    .replace(/\{\{anchorBase\}\}/g, page.slug ? pagePath(lang) : '')
    .replace('{{brandWidth}}', assets.brand.width)
    .replace('{{brandHeight}}', assets.brand.height)
    .replace('<!--languages-->', languages)
    .replace(/<(\w+)([^>]*?)\sdata-t="(\w+)"([^>]*)>[^<]*<\/\1>/g, (_, tag, before, key, after) => `<${tag}${before}${after}>${esc(t(key))}</${tag}>`)
    .replace(/\sdata-aria="(\w+)"/g, (_, key) => ` aria-label="${esc(t(key))}"`)
    .replace(/<img\b[^>]*>/g, tag => {
      const name = tag.match(/\sdata-photo="([\w-]+)"/);
      if (!name) return tag;
      const alt = tag.match(/\sdata-alt="(\w+)"/);
      const sizes = tag.match(/\ssizes="([^"]+)"/)[1];
      const className = tag.match(/\sclass="([^"]+)"/)?.[1];
      return photo(assets, name[1], sizes, t(alt[1]), { priority: tag.includes('fetchpriority="high"'), className });
    });
}

// Content-Security-Policy for Netlify (site/_headers). Everything is self-hosted; the inlined
// <style> and <script> blocks are allowed by their exact SHA-256 hash, so no 'unsafe-inline'.
// JSON-LD blocks are data, not scripts, and need no hash.
function securityHeaders(pages) {
  const hashes = { script: new Set(), style: new Set() };
  const sha = text => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;
  for (const html of pages) {
    for (const [, body] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) hashes.script.add(sha(body));
    for (const [, body] of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) hashes.style.add(sha(body));
  }
  const policy = [
    "default-src 'self'",
    `script-src 'self' ${[...hashes.script].join(' ')}`,
    `style-src 'self' ${[...hashes.style].join(' ')}`,
    "img-src 'self'", "font-src 'self'", "media-src 'self'", "connect-src 'self'",
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", 'upgrade-insecure-requests',
  ].join('; ');
  return `/*\n  Content-Security-Policy: ${policy}\n`;
}

async function build() {
  const [layout, homeTemplate] = await Promise.all([readFile(at('src/layout.html'), 'utf8'), readFile(at('src/home.html'), 'utf8')]);
  const content = new Function(`${await readFile(at('src/content.js'), 'utf8')};return CONTENT`)();
  const serviceContent = new Function(`${await readFile(at('src/services-content.js'), 'utf8')};return SERVICE_CONTENT`)();
  // Service pages exist for every service without an external site (maintenance links out).
  const servicePages = lang => serviceContent[lang].filter(s => !s.externalUrl);

  const pages = [{ key: 'home', slug: '', hero: HOME_HERO }];
  for (const s of servicePages('en')) pages.push({ key: s.slug, slug: s.slug, hero: s.image.replace(/\.webp$/, '') });
  pages.push({ key: 'contact', slug: 'contact', hero: HOME_HERO });

  const photoNames = new Set([HOME_HERO, ...HOME_PHOTOS, ...[...homeTemplate.matchAll(/data-photo="([\w-]+)"/g)].map(m => m[1])]);
  for (const lang of Object.keys(LANGS)) for (const s of servicePages(lang)) {
    photoNames.add(s.image.replace(/\.webp$/, ''));
    for (const section of s.sections) if (section.image) photoNames.add(section.image.replace(/\.webp$/, ''));
    for (const g of s.gallery || []) photoNames.add(g.image.replace(/\.webp$/, ''));
  }

  // Every character that can appear on any page, plus printable ASCII as a safety net.
  const strings = [];
  const collect = value => typeof value === 'string' ? strings.push(value) : Object.values(value).forEach(collect);
  collect(content); collect(serviceContent);
  const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
  const text = [...new Set(ascii + layout + homeTemplate + strings.join('') + '←→' + Object.values(LANGS).map(l => l.label).join(''))].join('');

  const [photos, logos, brand, fonts, video] = await Promise.all([buildPhotos([...photoNames]), buildLogos(), buildBrand(), buildFonts(text), buildVideo()]);
  const shareImages = await buildShareImages(pages, photos);
  const css = (await transform(fonts.css + await readFile(at('src/style.css'), 'utf8'), { loader: 'css', minify: true })).code.trim();
  const js = (await transform(await readFile(at('src/app.js'), 'utf8'), { loader: 'js', minify: true, target: 'es2020' })).code.trim();
  const assets = { photos, logos, brand, css, js, fonts: fonts.files, video, shareImages };

  const written = [], htmlPages = [];
  for (const lang of Object.keys(LANGS)) {
    const c = content[lang];
    const services = servicePages(lang);
    for (const page of pages) {
      const contact = page.key === 'contact';
      const s = page.slug && !contact && services.find(x => x.slug === page.slug);
      if (page.slug && !contact && !s) throw new Error(`Service "${page.slug}" missing in ${lang}`);
      const meta = s ? { ...page, service: s, title: `${s.title} | Bright Service Company SARL`, description: s.intro, imageAlt: s.alt }
        : contact ? { ...page, title: c.contactPageTitle, description: c.contactDescription, imageAlt: c.heroAlt }
        : { ...page, title: c.title, description: c.description, imageAlt: c.heroAlt };
      const main = s ? serviceMain(lang, s, c, services, assets) : contact ? contactMain(lang, c) : homeMain(homeTemplate, lang, c, services, assets);
      const html = renderPage(layout, lang, meta, c, main, assets);
      const leftover = html.match(/\{\{\w+\}\}|<!--\w+-->|data-(t|alt|aria|photo)=/);
      if (leftover) throw new Error(`Unrendered "${leftover[0]}" in ${pagePath(lang, page.slug)}`);
      const file = `${pagePath(lang, page.slug).slice(1)}index.html`;
      await writeOut(file, html);
      htmlPages.push(html);
      written.push(`${pagePath(lang, page.slug)} ${(html.length / 1024).toFixed(0)}K`);
    }
  }

  await writeOut('_headers', securityHeaders(htmlPages));

  const urls = pages.map(page => {
    const links = Object.keys(LANGS).map(code => `<xhtml:link rel="alternate" hreflang="${code}" href="${SITE}${pagePath(code, page.slug)}"/>`).join('')
      + `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${pagePath('en', page.slug)}"/>`;
    return Object.keys(LANGS).map(code => `  <url><loc>${SITE}${pagePath(code, page.slug)}</loc>${links}</url>\n`).join('');
  }).join('');
  await writeOut('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}</urlset>\n`);
  await writeOut('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

  console.log(`Built ${written.length} pages: ${written.join(', ')}\n${Object.keys(photos).length} photos, ${LOGOS.length} logos, video ${video.src}`);
}

build().catch(error => { console.error(error); process.exit(1) });
