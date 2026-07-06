# AMG Society

Storefront for AMG Society — premium embroidered apparel, made to order in Paterson, NJ.

**Live site:** https://amgsociety.com

## Stack
- Static site: `index.html` (store), `lookbook.html`, `gallery.html` + `styles.css`, `script.js`, `cart.js`, `gallery.js`.
- Shared cart: `cart.js` (localStorage) — used on every page; nav icon + floating button.
- Checkout: `api/checkout.js` — a Vercel serverless function that creates a Stripe Checkout Session. Prices are validated server-side (the browser never sends prices).
- Hosted on **Vercel** (site + function together). Domain via GoDaddy DNS.

## Environment variables (set in Vercel)
- `STRIPE_SECRET_KEY` — Stripe secret key (use the **test** key first, then the live key).
- `SITE_ORIGIN` — `https://amgsociety.com` (used for CORS + Stripe success/cancel redirect URLs).

## Local preview
No build step. Serve the folder (e.g. `ruby -run -e httpd . -p 8000`) and open `http://localhost:8000`.
Checkout locally is handled by a mock server (see project notes) since the real function needs Stripe keys.

## Pricing
Source of truth is `PRICING` in `script.js`, mirrored in `CATALOG` in `api/checkout.js` — **keep them in sync.**
Tee/Script Tee $45 · Sweatpants $70 · Hoodie $80 · Crop Set $135 · Short Set $100 (plus size upcharges for XL–4X).
