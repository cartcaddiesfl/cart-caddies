# Cart Caddies — pricing & profit app

a phone-first web app for pricing event carts. installs to your home screen, and your data syncs live between phone and desktop through Supabase.

## what's inside

- **quote** — event → shopping list → labor & travel → pricing (minimum / target / premium) → budget check → client quote (share, copy or print)
- **ingredients** — your price list. pick items from a dropdown on any cart; change a price once and every cart and quote updates
- **carts** — saved ingredient lists (s'mores, Biscoff s'mores, cotton candy, popcorn, hot chocolate, candy, charcuterie, lemonade). duplicate one and tweak it for a new cart
- **events** — saved quotes with status (quoted / booked / paid / lost) and booked totals
- **settings** — margins, minimum booking, 7% Broward sales tax, card fees, overhead, default add-ons and decor

starter ingredient prices are estimates of Sam's Club / BJ's / Amazon prices, marked **est.** until you update them.

## how it works

- static files served by GitHub Pages: `index.html`, `app.js`, `vendor/supabase.js`, `sw.js` (offline), `manifest.webmanifest` (home screen install)
- data: one Supabase table, `cc_records`, with row-level security so each login only sees its own rows. realtime is on, so changes on one device show on the others within a second or two
- a local copy is cached on each device, so the app opens instantly and keeps working offline; changes upload when you're back online

## try it without signing in

open `index.html?demo` — data stays in that browser only.
