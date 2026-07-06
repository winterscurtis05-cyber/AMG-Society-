/* ===== AMG SOCIETY — Archive gallery + lightbox ===== */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer:fine)').matches;
  const html = document.documentElement;
  const LIST = (window.GALLERY || []);
  const FULL = 'assets/gallery/';
  const THUMB = 'assets/gallery/thumb/';

  /* Nav: stays solid on the archive; mobile menu toggle */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('navLinks');
  burger.addEventListener('click', () => { menu.classList.toggle('open'); burger.classList.toggle('active'); });

  /* Count */
  const countEl = document.getElementById('countNum');
  if (countEl) countEl.textContent = LIST.length;

  /* Build grid */
  const grid = document.getElementById('gallery');
  const frag = document.createDocumentFragment();
  LIST.forEach((name, idx) => {
    const item = document.createElement('button');
    item.className = 'gallery-item';
    item.type = 'button';
    item.dataset.idx = idx;
    item.setAttribute('data-cursor', '');
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = 'AMG Society design ' + (idx + 1);
    img.src = THUMB + name.replace(/\.png$/i, '.jpg');
    img.onerror = () => { img.onerror = null; img.src = FULL + name; }; // fallback to full if thumb missing
    const tag = document.createElement('span');
    tag.className = 'gi-view';
    tag.textContent = 'View';
    item.append(img, tag);
    frag.appendChild(item);
  });
  grid.appendChild(frag);

  /* Reveal on scroll */
  const items = Array.from(grid.children);
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach((i) => i.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach((i) => io.observe(i));
  }

  /* ---------- Lightbox ---------- */
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbCounter = document.getElementById('lbCounter');
  let current = 0;

  function show(i) {
    current = (i + LIST.length) % LIST.length;
    lbImg.src = FULL + LIST[current];
    lbCounter.innerHTML = '<b>' + (current + 1) + '</b> / ' + LIST.length;
    // preload neighbours
    [current + 1, current - 1].forEach((k) => { const n = LIST[(k + LIST.length) % LIST.length]; if (n) new Image().src = FULL + n; });
  }
  function open(i) { show(i); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function close() { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

  grid.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-item');
    if (item) open(+item.dataset.idx);
  });
  document.getElementById('lbClose').addEventListener('click', close);
  document.getElementById('lbPrev').addEventListener('click', () => show(current - 1));
  document.getElementById('lbNext').addEventListener('click', () => show(current + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(current + 1);
    else if (e.key === 'ArrowLeft') show(current - 1);
  });

  /* ---------- Custom cursor (parity with main site) ---------- */
  if (fine && !reduce) {
    html.classList.add('using-cursor');
    const dot = document.createElement('div'); dot.className = 'cursor-dot';
    const ring = document.createElement('div'); ring.className = 'cursor-ring';
    document.body.append(dot, ring);
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; dot.style.left = mx + 'px'; dot.style.top = my + 'px'; });
    (function loop() { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; requestAnimationFrame(loop); })();
    const grow = () => ring.classList.add('grow'), shrink = () => ring.classList.remove('grow');
    document.querySelectorAll('a,button,[data-cursor]').forEach((el) => { el.addEventListener('pointerenter', grow); el.addEventListener('pointerleave', shrink); });
    // gallery items are added dynamically — delegate grow/shrink
    grid.addEventListener('pointerover', (e) => { if (e.target.closest('.gallery-item')) grow(); });
    grid.addEventListener('pointerout', (e) => { if (e.target.closest('.gallery-item')) shrink(); });
  }
})();
