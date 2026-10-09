// Builds the static site from src/ into the repo root, which is what Netlify publishes:
// index.html (en), ar/index.html, el/index.html, optimized images, fonts, robots.txt and sitemap.xml.
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

const SITE = 'https://brightlb.com';
const LANGS = {
  en: { path: '/', dir: 'ltr', locale: 'en_US', label: 'EN', preload: ['dm-sans-latin', 'manrope-latin'] },
  ar: { path: '/ar/', dir: 'rtl', locale: 'ar_LB', label: 'عربي', preload: ['noto-sans-arabic-arabic'] },
  el: { path: '/el/', dir: 'ltr', locale: 'el_GR', label: 'ΕΛ', preload: ['dm-sans-latin', 'manrope-greek'] },
};
const LOGOS = [['spinneys', 'Spinneys'], ['happy', 'Happy'], ['skygate', 'Sky Gate'], ['noknok', 'Noknok'], ['grabngo', 'Grab’n Go'], ['maliks', 'Maliks'], ['tawfeer', 'Tawfeer'], ['beirut-duty-free', 'Beirut Duty Free'], ['teska', 'Teska']];
const PHOTO_WIDTHS = [480, 640, 800, 1200, 1800];
const GALLERY_SIZES = '(max-width: 380px) 88vw, (max-width: 760px) 44vw, 22vw';
// [family, fontsource package, files] — only the subsets the site's three languages need.
const FONTS = [
  ['DM Sans', 'dm-sans', ['dm-sans-latin', 'dm-sans-latin-ext']],
  ['Manrope', 'manrope', ['manrope-latin', 'manrope-latin-ext', 'manrope-greek']],
  ['Noto Sans Arabic', 'noto-sans-arabic', ['noto-sans-arabic-arabic']],
];

const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function isFresh(source, output) {
  try { return (await stat(output)).mtimeMs >= (await stat(source)).mtimeMs } catch { return false }
}

async function writeOut(path, content) {
  await mkdir(dirname(at(path)), { recursive: true });
  await writeFile(at(path), content);
}

// Image variants are only regenerated when the source is newer than the output.
async function render(source, output, pipeline) {
  await mkdir(dirname(at(output)), { recursive: true });
  if (!(await isFresh(at(source), at(output)))) await pipeline(sharp(at(source))).toFile(at(output));
  return sharp(at(output)).metadata();
}

async function buildPhotos(names) {
  const photos = {};
  // Drop sizes of photos that are no longer on the site.
  await mkdir(at('assets/img'), { recursive: true });
  for (const file of await readdir(at('assets/img'))) {
    if (!names.includes(file.replace(/-d+.webp$/, ''))) await rm(at('assets/img', file));
  }
  for (const name of names) {
    const source = `source/photos/${name}.webp`;
    const { width, height } = await sharp(at(source)).metadata();
    const widths = PHOTO_WIDTHS.filter(w => w <= width);
    for (const w of widths) await render(source, `assets/img/${name}-${w}.webp`, img => img.resize({ width: w }).webp({ quality: 70, effort: 6 }));
    photos[name] = {
      width, height,
      src: `/assets/img/${name}-${widths.find(w => w >= 800) ?? widths.at(-1)}.webp`,
      srcset: widths.map(w => `/assets/img/${name}-${w}.webp ${w}w`).join(', '),
    };
  }
  return photos;
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
  await render('source/photos/real-70.webp', 'assets/brand/og-image.jpg', img => img.resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 80, mozjpeg: true }));
  return brand;
}

// Fonts are cut down to the characters the site actually uses (all languages); shaping features
// such as Arabic joining forms are kept. File names carry a content hash so they can be cached forever.
// The video is served as-is (H.264, index at the start so it streams); the poster becomes WebP.
async function buildVideo() {
  await mkdir(at('assets/video'), { recursive: true });
  if (!(await isFresh(at('source/video/bright-video.mp4'), at('assets/video/bright-video.mp4')))) await copyFile(at('source/video/bright-video.mp4'), at('assets/video/bright-video.mp4'));
  await render('source/video/bright-video-poster.jpg', 'assets/video/bright-video-poster.webp', img => img.webp({ quality: 70, effort: 6 }));
}

async function buildFonts(text) {
  let css = '';
  const files = {};
  await rm(at('assets/fonts'), { recursive: true, force: true });
  await mkdir(at('assets/fonts'), { recursive: true });
  for (const [family, pkg, subsets] of FONTS) {
    const sourceCss = await readFile(at(`node_modules/@fontsource-variable/${pkg}/wght.css`), 'utf8');
    for (const file of subsets) {
      const block = sourceCss.match(new RegExp(`/\\* ${file}-wght-normal \\*/\\s*@font-face\\s*{([^}]*)}`));
      if (!block) throw new Error(`Font subset not found: ${file}`);
      const original = await readFile(at(`node_modules/@fontsource-variable/${pkg}/files/${file}-wght-normal.woff2`));
      const subset = await subsetFont(original, text, { targetFormat: 'woff2' });
      files[file] = `/assets/fonts/${file}-${createHash('sha256').update(subset).digest('hex').slice(0, 8)}.woff2`;
      await writeFile(at(files[file].slice(1)), subset);
      const weight = block[1].match(/font-weight:\s*([^;]+);/)[1];
      const range = block[1].match(/unicode-range:\s*([^;]+);/)[1];
      css += `@font-face{font-family:'${family}';font-style:normal;font-display:swap;font-weight:${weight};src:url(${files[file]}) format('woff2');unicode-range:${range}}`;
    }
  }
  return { css, files };
}

function structuredData(lang, c) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE}/#organization`,
        name: 'Bright Service Company SARL',
        alternateName: 'Bright',
        url: `${SITE}/`,
        logo: `${SITE}/assets/brand/bright-512.png`,
        image: `${SITE}/assets/brand/og-image.jpg`,
        description: c.description,
        foundingDate: '2005',
        numberOfEmployees: { '@type': 'QuantitativeValue', value: 85 },
        areaServed: { '@type': 'Country', name: 'Lebanon' },
        knowsAbout: c.services.map(service => service.title),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: `${SITE}/`,
        name: 'Bright',
        inLanguage: Object.keys(LANGS),
        publisher: { '@id': `${SITE}/#organization` },
      },
      {
        '@type': 'WebPage',
        '@id': `${SITE}${LANGS[lang].path}#webpage`,
        url: `${SITE}${LANGS[lang].path}`,
        name: c.title,
        description: c.description,
        inLanguage: lang,
        isPartOf: { '@id': `${SITE}/#website` },
        about: { '@id': `${SITE}/#organization` },
        primaryImageOfPage: `${SITE}/assets/brand/og-image.jpg`,
      },
    ],
  };
}

function head(lang, c, assets) {
  const page = LANGS[lang];
  const url = `${SITE}${page.path}`;
  const alternates = Object.entries(LANGS).map(([code, { path }]) => `<link rel="alternate" hreflang="${code}" href="${SITE}${path}">`).join('');
  const otherLocales = Object.entries(LANGS).filter(([code]) => code !== lang).map(([, { locale }]) => `<meta property="og:locale:alternate" content="${locale}">`).join('');
  const preloads = page.preload.map(file => `<link rel="preload" href="${assets.fonts[file]}" as="font" type="font/woff2" crossorigin>`).join('');
  // Visitors who picked Arabic or Greek before land on their language; crawlers have no stored choice.
  // The js class switches phones to the menu button before first paint; without JS the links stay visible.
  const remember = `<script>document.documentElement.classList.add('js')${lang === 'en' ? ";try{var l=localStorage.getItem('bright-language');if(l==='ar'||l==='el')location.replace('/'+l+'/'+location.hash)}catch(e){}" : ''}</script>`;
  return [
    `<title>${esc(c.title)}</title>`,
    `<meta name="description" content="${esc(c.description)}">`,
    `<meta name="theme-color" content="#071b33">`,
    remember,
    `<link rel="canonical" href="${url}">`,
    alternates + `<link rel="alternate" hreflang="x-default" href="${SITE}/">`,
    preloads,
    `<link rel="icon" href="/assets/brand/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">`,
    `<meta property="og:type" content="website"><meta property="og:site_name" content="Bright"><meta property="og:url" content="${url}"><meta property="og:title" content="${esc(c.title)}"><meta property="og:description" content="${esc(c.description)}">`,
    `<meta property="og:image" content="${SITE}/assets/brand/og-image.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(c.heroAlt)}">`,
    `<meta property="og:locale" content="${page.locale}">${otherLocales}`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<script type="application/ld+json">${JSON.stringify(structuredData(lang, c)).replace(/</g, '\\u003c')}</script>`,
    `<style>${assets.css}</style>`,
  ].filter(Boolean).join('\n  ');
}

// The LCP hero decodes synchronously; everything else decodes off the main thread.
function photoAttributes(photo, priority = false) {
  return `src="${photo.src}" srcset="${photo.srcset}" width="${photo.width}" height="${photo.height}"${priority ? '' : ' decoding="async"'}`;
}

function renderPage(template, lang, content, assets) {
  const c = content[lang];
  const t = key => {
    if (typeof c[key] !== 'string') throw new Error(`Missing "${key}" in ${lang} content`);
    return c[key];
  };
  const languages = Object.entries(LANGS).map(([code, { path, label }]) =>
    `<a href="${path}" hreflang="${code}" lang="${code}"${code === lang ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const logoSet = hidden => `<div class="logo-set"${hidden ? ' aria-hidden="true"' : ''}>` + LOGOS.map(([file, name]) =>
    `<div class="client-logo"><img src="/assets/logos/${file}.webp" alt="${hidden ? '' : esc(name)}" width="${assets.logos[file].width}" height="${assets.logos[file].height}" loading="lazy" decoding="async"></div>`).join('') + '</div>';
  const services = c.services.map((service, index) =>
    `<details name="bright-services"${index === 0 ? ' open' : ''}><summary><span class="service-number" dir="ltr">${String(index + 1).padStart(2, '0')}</span><h3>${esc(service.title)}</h3></summary>` +
    `<div class="service-body"><p>${esc(service.body)}</p><ul>${service.items.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div></details>`).join('');
  const filters = Object.entries(c.categories).map(([key, label]) =>
    `<button type="button" data-category="${key}" aria-pressed="${key === 'all'}">${esc(label)}</button>`).join('');
  const gallery = c.photos.map((photo, index) => {
    const name = photo.src.replace(/\.webp$/, '');
    return `<button type="button" data-category="${photo.category}" aria-label="${esc(photo.title)}"><img ${photoAttributes(assets.photos[name])} sizes="${GALLERY_SIZES}" alt="${esc(photo.alt)}" loading="lazy">` +
      `<span class="gallery-caption"><strong>${esc(photo.title)}</strong><small dir="ltr">${String(index + 1).padStart(2, '0')}</small></span></button>`;
  }).join('');

  return template
    .replace('{{lang}}', lang)
    .replace('{{dir}}', LANGS[lang].dir)
    .replace('{{head}}', () => head(lang, c, assets))
    .replace('{{script}}', () => `<script>${assets.js}</script>`)
    .replace('{{galleryCount}}', c.photos.length)
    .replace('{{brandWidth}}', assets.brand.width)
    .replace('{{brandHeight}}', assets.brand.height)
    .replace('<!--languages-->', languages)
    .replace('<!--logos-->', logoSet(false) + logoSet(true))
    .replace('<!--services-->', services)
    .replace('<!--filters-->', filters)
    .replace('<!--gallery-->', gallery)
    .replace(/<(\w+)([^>]*?)\sdata-t="(\w+)"([^>]*)>[^<]*<\/\1>/g, (_, tag, before, key, after) => `<${tag}${before}${after}>${esc(t(key))}</${tag}>`)
    .replace(/\sdata-aria="(\w+)"/g, (_, key) => ` aria-label="${esc(t(key))}"`)
    .replace(/<img\b[^>]*>/g, tag => {
      const photo = tag.match(/\sdata-photo="([\w-]+)"/);
      if (photo) tag = tag.replace(photo[0], ' ' + photoAttributes(assets.photos[photo[1]], tag.includes('fetchpriority="high"')));
      const alt = tag.match(/\sdata-alt="(\w+)"/);
      if (alt) tag = tag.replace(alt[0], ` alt="${esc(t(alt[1]))}"`);
      return tag;
    });
}

async function build() {
  const template = await readFile(at('src/index.html'), 'utf8');
  const content = new Function(`${await readFile(at('src/content.js'), 'utf8')};return CONTENT`)();
  const photoNames = new Set([...template.matchAll(/data-photo="([\w-]+)"/g)].map(m => m[1]));
  for (const { photos } of Object.values(content)) for (const photo of photos) photoNames.add(photo.src.replace(/\.webp$/, ''));

  // Every character that can appear on any page, plus printable ASCII as a safety net.
  const strings = [];
  const collect = value => typeof value === 'string' ? strings.push(value) : Object.values(value).forEach(collect);
  collect(content);
  const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
  const text = [...new Set(ascii + template + strings.join('') + LOGOS.flat().join('') + Object.values(LANGS).map(l => l.label).join(''))].join('');

  const [photos, logos, brand, fonts] = await Promise.all([buildPhotos([...photoNames]), buildLogos(), buildBrand(), buildFonts(text), buildVideo()]);
  const css = (await transform(fonts.css + await readFile(at('src/style.css'), 'utf8'), { loader: 'css', minify: true })).code.trim();
  const js = (await transform(await readFile(at('src/app.js'), 'utf8'), { loader: 'js', minify: true, target: 'es2020' })).code.trim();
  const assets = { photos, logos, brand, css, js, fonts: fonts.files };

  for (const lang of Object.keys(LANGS)) {
    const html = renderPage(template, lang, content, assets);
    const leftover = html.match(/\{\{\w+\}\}|<!--\w+-->|data-(t|alt|aria|photo)=/);
    if (leftover) throw new Error(`Unrendered "${leftover[0]}" in ${lang} page`);
    await writeOut(`${LANGS[lang].path.slice(1)}index.html`, html);
  }

  const today = new Date().toISOString().slice(0, 10);
  const links = Object.entries(LANGS).map(([code, { path }]) => `<xhtml:link rel="alternate" hreflang="${code}" href="${SITE}${path}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>`;
  await writeOut('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    Object.values(LANGS).map(({ path }) => `  <url><loc>${SITE}${path}</loc><lastmod>${today}</lastmod>${links}</url>\n`).join('') + '</urlset>\n');
  await writeOut('robots.txt', `User-agent: *\nAllow: /\nDisallow: /src/\nDisallow: /source/\nDisallow: /scripts/\n\nSitemap: ${SITE}/sitemap.xml\n`);

  const sizes = await Promise.all(Object.values(LANGS).map(async ({ path }) => `${path} ${((await stat(at(`${path.slice(1)}index.html`))).size / 1024).toFixed(1)} KB`));
  console.log(`Built ${sizes.join(', ')}; ${Object.keys(photos).length} photos, ${LOGOS.length} logos.`);
}

build().catch(error => { console.error(error); process.exit(1) });
