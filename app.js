'use strict';
const LOGOS=[['spinneys','Spinneys'],['happy','Happy'],['skygate','Sky Gate'],['noknok','Noknok'],['grabngo','Grab’n Go'],['maliks','Maliks'],['tawfeer','Tawfeer'],['beirut-duty-free','Beirut Duty Free'],['teska','Teska']];
const logoTrack=document.getElementById('logo-track');
for(let copy=0;copy<2;copy++){
  const set=document.createElement('div');set.className='logo-set';
  if(copy)set.setAttribute('aria-hidden','true');
  LOGOS.forEach(([src,name])=>{const holder=document.createElement('div');holder.className='client-logo';const img=document.createElement('img');img.src=`assets/${src}.png`;img.alt=copy?'':name;img.loading='eager';holder.append(img);set.append(holder)});
  logoTrack.append(set);
}
let language='en',category='all',activeIndex=0,visiblePhotos=[];
const dialog=document.getElementById('lightbox');
function applyLanguage(lang){
  if(!CONTENT[lang])lang='en';language=lang;
  const c=CONTENT[lang];document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  document.title=c.title;document.querySelector('meta[name="description"]').content=c.description;
  document.querySelectorAll('[data-t]').forEach(el=>{if(c[el.dataset.t])el.textContent=c[el.dataset.t]});
  document.querySelectorAll('[data-alt]').forEach(el=>el.alt=c[el.dataset.alt]);
  document.querySelectorAll('[data-lang]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.lang===lang)));
  const list=document.getElementById('service-list');const opened=[...list.querySelectorAll('details')].map(d=>d.open);list.replaceChildren();
  c.services.forEach((service,index)=>{const details=document.createElement('details');details.setAttribute('name','bright-services');details.open=opened.length?opened[index]:index===0;const summary=document.createElement('summary');const number=document.createElement('span');number.className='service-number';number.textContent=String(index+1).padStart(2,'0');number.dir='ltr';const h3=document.createElement('h3');h3.textContent=service.title;summary.append(number,h3);const body=document.createElement('div');body.className='service-body';const p=document.createElement('p');p.textContent=service.body;const ul=document.createElement('ul');service.items.forEach(text=>{const li=document.createElement('li');li.textContent=text;ul.append(li)});body.append(p,ul);details.append(summary,body);list.append(details)});
  const filters=document.getElementById('filters');filters.replaceChildren();
  Object.entries(c.categories).forEach(([key,label])=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.category=key;button.setAttribute('aria-pressed',String(category===key));button.addEventListener('click',()=>{category=key;document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===key)));renderGallery()});filters.append(button)});
  renderGallery();if(dialog.open)showPhoto(activeIndex);
  try{localStorage.setItem('bright-language',lang)}catch{}
  const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState(null,'',url);
}
function renderGallery(){
  const c=CONTENT[language];visiblePhotos=c.photos.filter(p=>category==='all'||p.category===category);
  const gallery=document.getElementById('gallery');gallery.replaceChildren();
  visiblePhotos.forEach((photo,index)=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',photo.title);const img=document.createElement('img');img.src=`assets/${photo.src}`;img.alt=photo.alt;img.loading='lazy';img.width=3672;img.height=2066;const caption=document.createElement('span');caption.className='gallery-caption';const name=document.createElement('strong');name.textContent=photo.title;const number=document.createElement('small');number.dir='ltr';number.textContent=String(index+1).padStart(2,'0');caption.append(name,number);button.append(img,caption);button.addEventListener('click',()=>{showPhoto(index);dialog.showModal();document.body.classList.add('modal-open')});gallery.append(button)});
}
function showPhoto(index){
  activeIndex=(index+visiblePhotos.length)%visiblePhotos.length;const photo=visiblePhotos[activeIndex];
  const img=document.getElementById('lightbox-image');img.src=`assets/${photo.src}`;img.alt=photo.alt;
  document.getElementById('lightbox-label').textContent=photo.title;document.getElementById('photo-counter').textContent=`${activeIndex+1} / ${visiblePhotos.length}`;
}
document.querySelectorAll('[data-lang]').forEach(button=>button.addEventListener('click',()=>applyLanguage(button.dataset.lang)));
document.getElementById('close-lightbox').addEventListener('click',()=>dialog.close());
document.getElementById('previous-photo').addEventListener('click',()=>showPhoto(activeIndex-1));
document.getElementById('next-photo').addEventListener('click',()=>showPhoto(activeIndex+1));
dialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close()}});
dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight')showPhoto(activeIndex+1);if(event.key==='ArrowLeft')showPhoto(activeIndex-1)});
let stored;try{stored=localStorage.getItem('bright-language')}catch{}
applyLanguage(new URLSearchParams(location.search).get('lang')||stored||'en');
