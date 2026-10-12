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
