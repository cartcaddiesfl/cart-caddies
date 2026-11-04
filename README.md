# Cart Caddies — pricing & profit app

a phone-first web app for pricing event carts. installs to your home screen, and your data syncs live between phone and desktop through Supabase.

## what's inside

- **quote** — event → shopping list → labor & travel → pricing (minimum / target / premium, plus a client budget check) → client quote (share, copy or print)
- **ingredient cost** — each event is charged for what it uses (plus the buffer); the shopping list still rounds up to whole packs and shows what's left over. switch to whole-pack charging in settings
- **card fees** — only when the client pays by card, charged on the full total including tax
- **ingredients** — your price list. pick items from a dropdown on any cart; change a price once and every cart and quote updates
- **stock on hand** — each ingredient tracks what you have; shopping lists and trips only buy the difference. finishing a trip adds what you bought, and an after-event check sets stock to the leftovers you counted
- **carts** — saved ingredient lists (s'mores, Biscoff s'mores, cotton candy, popcorn, hot chocolate, candy, charcuterie, lemonade). duplicate one and tweak it for a new cart
- **shopping trip** — check items off at the store and type the shelf price; finishing the trip updates your ingredient prices and records what you spent
- **events** — saved quotes with status (quoted / booked / paid / lost) and booked totals
- **after-event check** — enter leftovers and actual costs; compares quote vs actual profit and suggests better per-guest amounts for the cart
- **settings** — margins, minimum booking, 7% Broward sales tax, card fees, overhead, default add-ons and decor

starter ingredient prices are estimates of Sam's Club / BJ's / Amazon prices, marked **est.** until you update them.

## how it works

- static files served by GitHub Pages: `index.html`, `app.js`, `vendor/supabase.js`, `sw.js` (offline), `manifest.webmanifest` (home screen install)
- data: one Supabase table, `cc_records`, with row-level security so each login only sees its own rows. realtime is on, so changes on one device show on the others within a second or two
- a local copy is cached on each device, so the app opens instantly and keeps working offline; changes upload when you're back online

## try it without signing in

open `index.html?demo` — data stays in that browser only.
