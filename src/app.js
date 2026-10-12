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
