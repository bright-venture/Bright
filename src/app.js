'use strict';
// All text and sections are prerendered by scripts/build.mjs; this only adds interaction.

// Phone menu (shown below 680px): links, Escape or a tap outside close it.
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.getElementById('main-navigation');
const setMenu = open => { navigation.classList.toggle('open', open); menuButton.setAttribute('aria-expanded', String(open)) };
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
navigation.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false) });
document.addEventListener('click', event => { if (!event.target.closest('.header')) setMenu(false) });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('open')) { setMenu(false); menuButton.focus() }
});

document.querySelectorAll('.languages a').forEach(link => link.addEventListener('click', () => {
  try { localStorage.setItem('bright-language', link.hreflang) } catch {}
}));

// Contact page copy buttons: copy the number or email, show a check and announce it for screen readers.
const copyStatus = document.getElementById('copy-status');
// Clipboard API first; some embedded browsers deny it, so fall back to a selected hidden field.
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true } catch {}
  const field = document.createElement('textarea');
  field.value = text; field.setAttribute('readonly', ''); field.className = 'sr-only';
  document.body.append(field); field.select();
  let copied = false;
  try { copied = document.execCommand('copy') } catch {}
  field.remove();
  return copied;
}
document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  if (!(await copyText(button.dataset.copy))) return;
  button.classList.add('copied');
  if (copyStatus) copyStatus.textContent = button.dataset.copied;
  clearTimeout(button.copyTimer);
  button.copyTimer = setTimeout(() => { button.classList.remove('copied'); if (copyStatus) copyStatus.textContent = '' }, 2000);
}));

// "Value of Agreement" chart: click/tap the curve or use arrow keys to select a year (latest selected by default).
// Values come from the prerendered points; without JS every value stays visible on the chart.
const agreement = document.getElementById('agreement-values');
if (agreement) {
  const svg = agreement.querySelector('svg');
  const points = [...agreement.querySelectorAll('.chart-point')];
  const labels = [...agreement.querySelectorAll('.chart-value')];
  const ring = agreement.querySelector('.chart-selection-ring');
  const yearOut = agreement.querySelector('[data-selected-year]');
  const valueOut = agreement.querySelector('[data-selected-value]');
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  let selected = points.length - 1;
  const select = index => {
    if (index < 0 || index >= points.length) return;
    selected = index;
    const { year, value } = points[index].dataset;
    yearOut.textContent = year;
    valueOut.textContent = money.format(Number(value));
    svg.setAttribute('aria-valuenow', year);
    svg.setAttribute('aria-valuetext', `${year}: USD ${Number(value).toLocaleString('en-US')}`);
    ring.setAttribute('cx', points[index].getAttribute('cx'));
    ring.setAttribute('cy', points[index].getAttribute('cy'));
    points.forEach((point, i) => {
      point.classList.toggle('chart-point-selected', i === index);
      point.setAttribute('r', i === index ? '7' : '5');
      labels[i].classList.toggle('chart-value-selected', i === index);
    });
  };
  svg.addEventListener('click', event => {
    const bounds = svg.getBoundingClientRect();
    if (!bounds.width) return;
    const x = (event.clientX - bounds.left) / bounds.width * 528;
    let nearest = 0;
    points.forEach((point, i) => { if (Math.abs(point.getAttribute('cx') - x) < Math.abs(points[nearest].getAttribute('cx') - x)) nearest = i });
    select(nearest);
  });
  svg.addEventListener('keydown', event => {
    const next = { ArrowRight: selected + 1, ArrowUp: selected + 1, ArrowLeft: selected - 1, ArrowDown: selected - 1, Home: 0, End: points.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(Math.max(0, Math.min(points.length - 1, next)));
  });
  agreement.querySelector('[data-chart-hint]').hidden = false;
  agreement.classList.add('is-interactive');
}

// Browsers fetch a poster immediately, even far below the fold; set it only as the video comes near.
const video = document.getElementById('bright-video');
if (video) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { video.poster = video.dataset.poster; observer.disconnect() }
    }, { rootMargin: '600px' });
    observer.observe(video);
  } else video.poster = video.dataset.poster;
}
