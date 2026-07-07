/* ===== AMG SOCIETY — premium motion engine ===== */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer:fine)').matches;
  // Phones / touch / narrow screens: disable heavy effects to prevent mobile tab reloads on fast scroll.
  const mobile = !fine || matchMedia('(max-width: 820px)').matches;
  const hasGSAP = typeof gsap !== 'undefined';
  const hasST = hasGSAP && typeof ScrollTrigger !== 'undefined';
  const hasLenis = typeof Lenis !== 'undefined';
  const html = document.documentElement;
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  const canAnim = hasST && !reduce;
  // JS is live now — take over visibility (CSS .pre-anim only guards against FOUC before this runs)
  html.classList.remove('pre-anim');

  /* ---------- Lenis smooth scroll ---------- */
  let lenis = null;
  if (!reduce && hasLenis && !mobile) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    if (hasGSAP) {
      lenis.on('scroll', () => { if (hasST) ScrollTrigger.update(); });
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* ---------- Nav shrink + mobile menu + smooth anchors ---------- */
  const nav = document.getElementById('nav');
  const setShrink = (y) => nav.classList.toggle('shrink', y > 60);
  setShrink(window.scrollY);
  if (lenis) lenis.on('scroll', ({ scroll }) => setShrink(scroll));
  else window.addEventListener('scroll', () => setShrink(window.scrollY), { passive: true });

  const burger = document.getElementById('burger');
  const menu = document.getElementById('navLinks');
  const closeMenu = () => { menu.classList.remove('open'); burger.classList.remove('active'); };
  burger.addEventListener('click', () => { menu.classList.toggle('open'); burger.classList.toggle('active'); });

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const el = document.querySelector(id);
        if (el) { e.preventDefault(); closeMenu(); lenis ? lenis.scrollTo(el, { offset: -72 }) : el.scrollIntoView({ behavior: 'smooth' }); }
      }
    });
  });

  /* ---------- GSAP reveals / parallax / hero / counters ---------- */
  if (canAnim) {
    gsap.set('[data-reveal]', { opacity: 0, y: 42 });
    gsap.set('[data-reveal="scale"]', { opacity: 0, y: 0, scale: 0.92 });
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%',
      once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out', stagger: 0.1, overwrite: true }),
    });

    gsap.set('[data-hero]', { opacity: 0, y: 30 });
    gsap.to('[data-hero]', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.13, delay: 0.25 });

    if (!mobile) gsap.utils.toArray('[data-parallax]').forEach((el) => {
      const sp = parseFloat(el.dataset.parallax) || 0.2;
      gsap.to(el, { yPercent: -sp * 100, ease: 'none', scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    gsap.utils.toArray('[data-count]').forEach((el) => {
      const end = +el.dataset.count, o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)) }) });
    });

    ScrollTrigger.refresh();
  } else {
    document.querySelectorAll('[data-count]').forEach((el) => (el.textContent = el.dataset.count));
  }

  /* ---------- Hero particle field ---------- */
  (function () {
    const canvas = document.getElementById('particles');
    if (!canvas || reduce || mobile) return;
    const ctx = canvas.getContext('2d');
    let w, h, dpr, nodes = [], raf = null, running = false;
    const mouse = { x: -999, y: -999 };

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.round((w * h) / 16000));
      nodes = Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25 }));
    }
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        const mdx = mouse.x - n.x, mdy = mouse.y - n.y, md = Math.hypot(mdx, mdy);
        if (md < 140) { n.x += mdx * 0.002; n.y += mdy * 0.002; }
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.3, 0, 7); ctx.fillStyle = 'rgba(212,175,55,.7)'; ctx.fill();
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j], dx = n.x - m.x, dy = n.y - m.y, d = Math.hypot(dx, dy);
          if (d < 128) { ctx.strokeStyle = 'rgba(212,175,55,' + (0.16 * (1 - d / 128)) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke(); }
        }
        if (md < 150) { ctx.strokeStyle = 'rgba(252,246,186,' + (0.22 * (1 - md / 150)) + ')'; ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!running) { running = true; frame(); } }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); }

    size();
    window.addEventListener('resize', size);
    const hero = document.getElementById('hero');
    hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', () => { mouse.x = -999; mouse.y = -999; });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => es.forEach((en) => (en.isIntersecting ? start() : stop())), { threshold: 0 }).observe(hero);
    } else start();
  })();

  /* ---------- Product tilt + cursor spotlight (desktop only) ---------- */
  if (!mobile) document.querySelectorAll('.product').forEach((card) => {
    const media = card.querySelector('.product-media');
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      media.style.setProperty('--mx', px * 100 + '%');
      media.style.setProperty('--my', py * 100 + '%');
      if (!reduce) { card.style.setProperty('--ry', (px - 0.5) * 11 + 'deg'); card.style.setProperty('--rx', (0.5 - py) * 9 + 'deg'); }
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
  });

  /* ---------- Magnetic buttons ---------- */
  if (fine && !reduce) {
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * 0.3 + 'px,' + (e.clientY - r.top - r.height / 2) * 0.4 + 'px)';
      });
      el.addEventListener('pointerleave', () => (el.style.transform = ''));
    });
  }

  /* ---------- Custom cursor ---------- */
  if (fine && !reduce) {
    html.classList.add('using-cursor');
    const dot = document.createElement('div'); dot.className = 'cursor-dot';
    const ring = document.createElement('div'); ring.className = 'cursor-ring';
    document.body.append(dot, ring);
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; dot.style.left = mx + 'px'; dot.style.top = my + 'px'; });
    (function loop() { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; requestAnimationFrame(loop); })();
    document.querySelectorAll('a,button,[data-cursor]').forEach((el) => {
      el.addEventListener('pointerenter', () => ring.classList.add('grow'));
      el.addEventListener('pointerleave', () => ring.classList.remove('grow'));
    });
  }

  /* ---------- Color filters ---------- */
  const filters = document.getElementById('filters');
  const products = Array.from(document.querySelectorAll('#grid .product'));
  if (filters) filters.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip'); if (!btn) return;
    filters.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    products.forEach((p) => p.classList.toggle('hide', !(f === 'all' || p.dataset.color === f)));
    if (hasST) ScrollTrigger.refresh();
  });

  /* ---------- Sizes + size-based pricing ---------- */
  const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2X', '3X', '4X'];
  const PRICING = {
    tee: { base: 45, up: { XL: 5, '2X': 10, '3X': 15, '4X': 20 } },
    set: { base: 135, up: { XL: 10, '2X': 20, '3X': 30, '4X': 40 } },
    shortset: { base: 100, up: { XL: 10, '2X': 20, '3X': 30, '4X': 40 } },
    sweatpants: { base: 70, up: { XL: 10, '2X': 20, '3X': 30, '4X': 40 } },
    hoodie: { base: 80, up: { XL: 10, '2X': 20, '3X': 30, '4X': 40 } },
  };
  const productType = (card) =>
    card.classList.contains('shortset') ? 'shortset'
      : card.classList.contains('set') ? 'set'
      : card.classList.contains('sweatpants') ? 'sweatpants'
        : card.classList.contains('hoodie') ? 'hoodie'
          : 'tee';
  const priceFor = (type, size) => { const p = PRICING[type] || PRICING.tee; return p.base + (p.up[size] || 0); };

  document.querySelectorAll('.product').forEach((card) => {
    const type = productType(card);
    const row = document.createElement('div');
    row.className = 'sizes';
    row.innerHTML = SIZES.map((s) => `<button type="button" class="size${s === 'M' ? ' active' : ''}" data-size="${s}">${s}</button>`).join('');
    card.appendChild(row);
    const priceEl = card.querySelector('.product-price');
    const setPrice = (size) => { if (priceEl) priceEl.textContent = '$' + priceFor(type, size); };
    setPrice('M');
    row.addEventListener('click', (e) => {
      const b = e.target.closest('.size'); if (!b) return;
      e.stopPropagation();
      row.querySelectorAll('.size').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      setPrice(b.dataset.size);
    });
  });

  /* ---------- Add to Bag -> shared cart (cart.js) ---------- */
  document.querySelectorAll(".product-add").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = btn.closest(".product");
      const type = productType(card);
      const activeSize = card.querySelector(".size.active");
      const size = activeSize ? activeSize.dataset.size : "M";
      const { name, color, img } = btn.dataset;
      const price = priceFor(type, size);
      if (window.AMGCart) window.AMGCart.add({ name, color, size, price, img });
      const label = btn.textContent; btn.textContent = "Added \u2713";
      setTimeout(() => (btn.textContent = label), 1100);
    });
  });

  /* ---------- Newsletter ---------- */
  const jf = document.getElementById('joinForm'), jn = document.getElementById('joinNote');
  jf.addEventListener('submit', (e) => { e.preventDefault(); jf.reset(); jf.hidden = true; jn.hidden = false; });

  /* ---------- Archive teaser strip ---------- */
  const strip = document.getElementById('archiveStrip');
  if (strip && Array.isArray(window.GALLERY) && window.GALLERY.length) {
    strip.innerHTML = window.GALLERY.slice(0, 8).map((n) =>
      `<a href="gallery.html" class="archive-thumb" data-cursor><img src="assets/gallery/thumb/${n.replace(/\.png$/i, '.jpg')}" alt="AMG design" loading="lazy"></a>`
    ).join('');
  }
})();
