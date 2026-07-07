// AMG Society — Stripe Checkout Session creator (Vercel serverless function).
//
// Security model: the browser sends ONLY { name, color, size, qty } per line.
// It never sends a price. This function is the single source of truth for
// pricing — it looks each product up in CATALOG below and recomputes the
// price server-side, so prices cannot be tampered with from the client.
//
// This CATALOG mirrors the PRICING object in /script.js. If you change prices
// on the site, change them here too (both must match).

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2X', '3X', '4X'];

// base = price for XS–L. up = extra dollars added for larger sizes.
const CATALOG = {
  'All Money Tee':                  { base: 45,  up: { XL: 5,  '2X': 10, '3X': 15, '4X': 20 } },
  'AMG Society Script Tee':         { base: 45,  up: { XL: 5,  '2X': 10, '3X': 15, '4X': 20 } },
  'AMG Society Sweatpants':         { base: 70,  up: { XL: 10, '2X': 20, '3X': 30, '4X': 40 } },
  'AMG Society Hoodie':             { base: 80,  up: { XL: 10, '2X': 20, '3X': 30, '4X': 40 } },
  'All Money Crop Set':             { base: 135, up: { XL: 10, '2X': 20, '3X': 30, '4X': 40 } },
  'All Money Puff Print Short Set': { base: 100, up: { XL: 10, '2X': 20, '3X': 30, '4X': 40 } },
};

// Set SITE_ORIGIN in Vercel env to your GitHub Pages URL (e.g.
// https://username.github.io/amg-society-studio) to lock CORS + redirects.
const SITE_ORIGIN = process.env.SITE_ORIGIN || '*';

function setCors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  const origin = SITE_ORIGIN !== '*' ? SITE_ORIGIN : (req.headers.origin || '*');
  setCors(res, origin);

  if (req.method === 'OPTIONS') return res.status(204).end();
  // TEMP diagnostic: which Stripe account is this key + recent charges. Remove after.
  if (req.method === 'GET') {
    try {
      const acct = await stripe.accounts.retrieve();
      const charges = await stripe.charges.list({ limit: 6 });
      return res.status(200).json({
        account: {
          id: acct.id,
          name: (acct.business_profile && acct.business_profile.name) || acct.settings?.dashboard?.display_name || null,
          email: acct.email,
          charges_enabled: acct.charges_enabled,
          payouts_enabled: acct.payouts_enabled,
        },
        recentCharges: charges.data.map((c) => ({
          amount: c.amount / 100,
          status: c.status,
          livemode: c.livemode,
          created: new Date(c.created * 1000).toISOString(),
          method: c.payment_method_details && c.payment_method_details.type,
        })),
      });
    } catch (e) {
      return res.status(200).json({ diagError: e.message });
    }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const items = (req.body && req.body.items) || [];
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your bag is empty.' });
    }
    if (items.length > 50) return res.status(400).json({ error: 'Too many line items.' });

    const line_items = items.map((it) => {
      const name = String(it.name || '');
      const color = String(it.color || '').slice(0, 40);
      const size = String(it.size || 'M');
      const qty = Math.max(1, Math.min(20, parseInt(it.qty, 10) || 1));

      const product = CATALOG[name];
      if (!product) throw new Error(`Unknown product: ${name}`);
      if (!SIZES.includes(size)) throw new Error(`Invalid size: ${size}`);

      const price = product.base + (product.up[size] || 0); // dollars
      return {
        quantity: qty,
        price_data: {
          currency: 'usd',
          unit_amount: price * 100, // cents
          product_data: { name: `${name} — ${color} · ${size}` },
        },
      };
    });

    const redirectBase = SITE_ORIGIN !== '*' ? SITE_ORIGIN : (req.headers.origin || '');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${redirectBase}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${redirectBase}/cancel.html`,
      shipping_address_collection: { allowed_countries: ['US'] },
      phone_number_collection: { enabled: true },
      // Free standard shipping for now (matches "complimentary shipping"
      // messaging). To add paid tiers or a $150 free-shipping threshold,
      // manage Shipping rates in the Stripe Dashboard and reference them here.
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'usd' },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 7 },
            },
          },
        },
      ],
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Checkout error' });
  }
}
