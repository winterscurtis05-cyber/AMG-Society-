/* ===== AMG SOCIETY — shared cart (all pages) =====
   One source of truth for the bag. Persists in localStorage, renders the
   drawer, updates every count badge (nav + floating), and runs checkout.
   Homepage products call window.AMGCart.add(). Works on any page: it reuses
   an existing #cartDrawer/#overlay if present, otherwise injects them, and
   injects its own CSS so it also works on pages without styles.css. */
(function () {
  'use strict';

  var CART_KEY = 'amg_cart';
  // The site and the /api/checkout function are hosted together on Vercel
  // (same origin), so this is just a relative path. Locally, the mock server
  // answers the same path.
  var CHECKOUT_ENDPOINT = '/api/checkout';

  var cart = load();
  function load() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } }
  function save() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} }
  var count = function () { return cart.reduce(function (n, i) { return n + i.qty; }, 0); };

  var hasSiteCss = !!document.querySelector('link[href*="styles.css"]');

  /* ---- CSS: floating button always; drawer/overlay fallback only if no styles.css ---- */
  function injectCss() {
    var css = [
      /* Floating cart button (all pages) */
      '.amgc-fab{position:fixed;right:22px;bottom:22px;z-index:65;width:56px;height:56px;border:none;border-radius:50%;',
      'cursor:pointer;display:grid;place-items:center;background:linear-gradient(120deg,#e8c874,#c9a24b);',
      'color:#141210;box-shadow:0 8px 26px rgba(0,0,0,.4);transition:transform .3s,opacity .3s}',
      '.amgc-fab:hover{transform:translateY(-3px)}',
      '.amgc-fab svg{width:24px;height:24px;fill:none;stroke:#141210;stroke-width:1.8}',
      '.amgc-fab .cart-count{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;',
      'border-radius:11px;background:#141210;color:#e8c874;font:600 11px/20px Jost,system-ui,sans-serif;',
      'text-align:center;place-items:center}',
      '.amgc-fab.amgc-hide{opacity:0;pointer-events:none;transform:scale(.6)}'
    ];
    if (!hasSiteCss) {
      /* Minimal self-contained drawer/overlay/nav-icon for pages without styles.css (Lookbook) */
      css = css.concat([
        '.overlay{position:fixed;inset:0;background:rgba(0,0,0,.62);opacity:0;visibility:hidden;transition:.4s;z-index:60;backdrop-filter:blur(2px)}',
        '.overlay.show{opacity:1;visibility:visible}',
        '.cart-drawer{position:fixed;top:0;right:0;height:100%;width:min(420px,90vw);background:#0d0d10;color:#f4f1ea;',
        'z-index:70;transform:translateX(100%);transition:transform .45s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;',
        'border-left:1px solid rgba(201,162,75,.25);font-family:Jost,system-ui,sans-serif}',
        '.cart-drawer.open{transform:translateX(0)}',
        '.cart-head{display:flex;align-items:center;justify-content:space-between;padding:22px 22px 14px;border-bottom:1px solid rgba(255,255,255,.08)}',
        '.cart-head h3{margin:0;font-family:Cinzel,serif;font-weight:600;letter-spacing:.04em}',
        '.cart-items{flex:1;overflow-y:auto;padding:14px 22px;display:flex;flex-direction:column;gap:14px}',
        '.cart-line{display:grid;grid-template-columns:56px 1fr auto;gap:12px;align-items:center}',
        '.cart-line img{width:56px;height:56px;object-fit:cover;border-radius:4px;background:#1a1a1f}',
        '.cart-line h4{margin:0;font-size:.9rem;font-weight:500}',
        '.cart-line .meta{margin:2px 0 0;font-size:.75rem;color:#9b958a}',
        '.cart-line .price{margin:2px 0 0;font-size:.8rem;color:#e8c874}',
        '.cart-line .remove{background:none;border:none;color:#8a857b;cursor:pointer;font-size:.72rem;text-decoration:underline}',
        '.cart-empty{color:#9b958a;text-align:center;padding:40px 0;line-height:1.7}',
        '.cart-foot{padding:18px 22px;border-top:1px solid rgba(255,255,255,.08)}',
        '.cart-subtotal{display:flex;justify-content:space-between;margin-bottom:14px;font-weight:500}',
        '.cart-secure{margin:12px 0 0;text-align:center;font-size:.72rem;color:#8a857b}',
        '.icon-btn{background:none;border:none;color:inherit;cursor:pointer;position:relative;padding:6px}',
        '.cart-count{font:600 11px/1 Jost,system-ui,sans-serif}',
        '.amgc-navcart{background:none;border:none;color:inherit;cursor:pointer;position:relative;padding:6px}',
        '.amgc-navcart svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.6}',
        '.amgc-navcart .cart-count{position:absolute;top:-2px;right:-4px;min-width:16px;height:16px;padding:0 4px;',
        'border-radius:8px;background:#e8c874;color:#141210;display:grid;place-items:center}',
        '.cart-drawer .btn{display:block;width:100%;padding:14px 26px;border-radius:2px;cursor:pointer;text-align:center;',
        'font:500 .78rem/1 Jost,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;border:none}',
        '.cart-drawer .btn-gold{background:linear-gradient(120deg,#e8c874,#c9a24b);color:#141210}'
      ]);
    }
    var s = document.createElement('style');
    s.id = 'amgc-styles';
    s.textContent = css.join('');
    document.head.appendChild(s);
  }

  /* ---- Ensure overlay + drawer exist ---- */
  function ensureDom() {
    if (!document.getElementById('overlay')) {
      var ov = document.createElement('div');
      ov.className = 'overlay'; ov.id = 'overlay';
      document.body.appendChild(ov);
    }
    if (!document.getElementById('cartDrawer')) {
      var d = document.createElement('aside');
      d.className = 'cart-drawer'; d.id = 'cartDrawer'; d.setAttribute('aria-label', 'Shopping bag');
      d.innerHTML =
        '<header class="cart-head"><h3>Your Bag</h3>' +
        '<button class="icon-btn" id="cartClose" aria-label="Close"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button></header>' +
        '<div class="cart-items" id="cartItems"></div>' +
        '<footer class="cart-foot"><div class="cart-subtotal"><span>Subtotal</span><span id="cartSubtotal">$0</span></div>' +
        '<button class="btn btn-gold btn-block" id="checkoutBtn">Checkout</button>' +
        '<p class="cart-secure">🔒 Secure checkout powered by Stripe</p></footer>';
      document.body.appendChild(d);
    }
    // Floating button
    var fab = document.createElement('button');
    fab.className = 'amgc-fab'; fab.id = 'amgcFab'; fab.setAttribute('aria-label', 'Open cart');
    fab.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M6 7h12l-1.2 12.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>' +
      '<span class="cart-count">0</span>';
    document.body.appendChild(fab);
  }

  var drawer, overlay;
  function open() { drawer.classList.add('open'); overlay.classList.add('show'); document.getElementById('amgcFab').classList.add('amgc-hide'); }
  function close() { drawer.classList.remove('open'); overlay.classList.remove('show'); document.getElementById('amgcFab').classList.remove('amgc-hide'); }

  function render() {
    var qty = count();
    var total = cart.reduce(function (s, i) { return s + i.qty * i.price; }, 0);
    document.querySelectorAll('.cart-count').forEach(function (el) { el.textContent = qty; });
    var fabBadge = document.querySelector('.amgc-fab .cart-count');
    if (fabBadge) fabBadge.style.display = qty ? 'grid' : 'none';
    var sub = document.getElementById('cartSubtotal'); if (sub) sub.textContent = '$' + total;
    var items = document.getElementById('cartItems');
    if (items) items.innerHTML = cart.length
      ? cart.map(function (i, idx) {
          return '<div class="cart-line"><img src="' + i.img + '" alt="' + i.color + '"/>' +
            '<div class="info"><h4>' + i.name + '</h4><p class="meta">' + i.color + ' · ' + i.size + ' · Qty ' + i.qty + '</p>' +
            '<p class="price">$' + (i.price * i.qty) + '</p></div>' +
            '<button class="remove" data-idx="' + idx + '">Remove</button></div>';
        }).join('')
      : '<p class="cart-empty">Your bag is empty.<br>The crown awaits. 👑</p>';
    save();
  }

  function add(item) {
    var ex = cart.find(function (i) { return i.name === item.name && i.color === item.color && i.size === item.size; });
    if (ex) ex.qty++; else cart.push({ name: item.name, color: item.color, size: item.size, price: item.price, img: item.img, qty: 1 });
    render(); open();
  }

  async function checkout(btn) {
    if (!cart.length) return;
    var original = btn.textContent;
    btn.disabled = true; btn.textContent = 'Redirecting…';
    try {
      var res = await fetch(CHECKOUT_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart.map(function (i) { return { name: i.name, color: i.color, size: i.size, qty: i.qty }; }) })
      });
      var data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout could not start.');
      window.location.href = data.url;
    } catch (err) {
      btn.disabled = false; btn.textContent = original;
      alert('Sorry — checkout could not start.\n' + (err.message || '') + '\nPlease try again, or DM @AMG to order.');
    }
  }

  function init() {
    injectCss();
    ensureDom();
    drawer = document.getElementById('cartDrawer');
    overlay = document.getElementById('overlay');

    // Openers: nav bag icon(s) + floating button
    ['#cartToggle', '.amgc-navcart', '#amgcFab'].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) { el.addEventListener('click', open); });
    });
    // Closers
    var cc = document.getElementById('cartClose'); if (cc) cc.addEventListener('click', close);
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    // Remove line
    var items = document.getElementById('cartItems');
    if (items) items.addEventListener('click', function (e) {
      var b = e.target.closest('.remove'); if (b) { cart.splice(+b.dataset.idx, 1); render(); }
    });
    // Checkout
    var chk = document.getElementById('checkoutBtn');
    if (chk) chk.addEventListener('click', function () { checkout(chk); });

    render();
  }

  window.AMGCart = { add: add, open: open, close: close, render: render, count: count };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
