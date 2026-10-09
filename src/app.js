'use strict';
// Page text, services, filters and gallery are prerendered by scripts/build.mjs; this only adds interaction.
const gallery = document.getElementById('gallery');
const items = [...gallery.querySelectorAll('button')];
const dialog = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-image');
let visiblePhotos = items, activeIndex = 0;

document.querySelectorAll('.languages a').forEach(link => link.addEventListener('click', () => {
  try { localStorage.setItem('bright-language', link.hreflang) } catch {}
}));

document.getElementById('filters').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  const category = button.dataset.category;
  for (const other of button.parentElement.children) other.setAttribute('aria-pressed', String(other === button));
  visiblePhotos = items.filter(item => category === 'all' || item.dataset.category === category);
  items.forEach(item => { item.hidden = !visiblePhotos.includes(item) });
  visiblePhotos.forEach((item, index) => { item.querySelector('small').textContent = String(index + 1).padStart(2, '0') });
  // Two photos sit in two wider columns on desktop (even rows), so ask for larger image files.
  gallery.dataset.count = visiblePhotos.length;
  const sizes = visiblePhotos.length === 2 ? '(max-width: 380px) 88vw, 44vw' : '(max-width: 380px) 88vw, (max-width: 760px) 44vw, 22vw';
  visiblePhotos.forEach(item => { item.querySelector('img').sizes = sizes });
});

// Browsers fetch a poster immediately, even far below the fold; set it only as the video comes near.
const video = document.getElementById('bright-video');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { video.poster = video.dataset.poster; observer.disconnect() }
  }, { rootMargin: '600px' });
  observer.observe(video);
} else video.poster = video.dataset.poster;

function showPhoto(index) {
  activeIndex = (index + visiblePhotos.length) % visiblePhotos.length;
  const item = visiblePhotos[activeIndex], img = item.querySelector('img');
  lightboxImage.srcset = img.srcset; lightboxImage.src = img.src; lightboxImage.alt = img.alt;
  document.getElementById('lightbox-label').textContent = item.getAttribute('aria-label');
  document.getElementById('photo-counter').textContent = `${activeIndex + 1} / ${visiblePhotos.length}`;
}

items.forEach(item => item.addEventListener('click', () => {
  showPhoto(visiblePhotos.indexOf(item)); dialog.showModal(); document.body.classList.add('modal-open');
}));
document.getElementById('close-lightbox').addEventListener('click', () => dialog.close());
document.getElementById('previous-photo').addEventListener('click', () => showPhoto(activeIndex - 1));
document.getElementById('next-photo').addEventListener('click', () => showPhoto(activeIndex + 1));
dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
dialog.addEventListener('keydown', event => {
  const forward = document.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  const back = document.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
  if (event.key === forward) showPhoto(activeIndex + 1);
  if (event.key === back) showPhoto(activeIndex - 1);
});
