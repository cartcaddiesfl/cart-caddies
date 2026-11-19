---
name: refresh-outreach-leads
description: Change, rotate or add the Google Maps search phrases used by the Cart Caddies "Outreach Lead Finder" Make scenario, so weekly scrapes return fresh leads instead of the same ones. Use when the user asks to change/refresh/rotate lead search phrases, target new cities or neighborhoods, add a segment (planners, luxury residential, boutique fitness), or says the scrape keeps returning the same leads.
---

# Refresh outreach lead search phrases

## What this controls

- **Make scenario:** "Cart Caddies - Outreach Lead Finder", id `7038719` (team `1871755`, org `6555318`). Runs weekly, Wednesday 09:10 eastern.
- **Module 1** (HTTP) calls the Apify Google Maps scraper. The phrases live in its `data` field as JSON: `searchStringsArray` plus `maxCrawledPlacesPerSearch`.
- **Modules 3 and 4** look the business name up in the "new leads" tab. **Module 5** adds it only if it is not already listed.
- **Destination:** Google Sheet "Cart Caddies Outreach" (`1t3K_mrFGbv9rXQYzxlirhohKLCRCLFOnder-Ng88p64`), tab `new leads`, owned by cartcaddiesfl@gmail.com. The user reviews each row there and picks "yes" or "skip".

## Steps

1. **Read the current setup.** `scenarios_get` on 7038719. Parse the `data` string of module 1.
2. **Find phrases already used.** Read the `source` column of the "new leads" tab. Each value is `google maps: <phrase>`. Do not reuse those phrases unless the user asks. The same phrase returns the same top results every time, which is why scrapes go stale.
3. **Choose the new list.** Use the phrase bank below. Default focus is Broward and Palm Beach counties unless the user says otherwise. Ask only if the scope is unclear.
4. **Size the run.** Default is about 15 phrases at 4 places each (60 places). The last full run scraped 42 places in 137 seconds, and the HTTP module times out at 300 seconds, so stay under about 70 places per run. About 70% of scraped places have an email or an Instagram link and are kept.
5. **Edit only the `data` string of module 1.** Call `scenarios_update` with the complete fetched blueprint, changing nothing else, and pass the existing `scheduling` unchanged (weekly, days [3], time "09:10"). Never print, copy or alter the Apify token inside the module 1 URL.
6. **Report back:** phrases removed and added, the maximum places per run, the next scheduled run, and that rows only reach the sheet when they have an email or Instagram.
7. **Offer a test run.** `scenarios_run` can return "Bad Gateway" even when the run started. Check `executions_list` instead of running it again. After a run, read the sheet and confirm new rows landed and no company name appears twice.

## How a phrase becomes a segment (module 5, field "5")

- contains `planner` -> `planner`
- contains `apartment` -> `residential`
- contains `pilates`, `barre`, `cycl`, `gym`, `fitness` or `yoga` -> `fitness`
- anything else -> blank (the user must set the segment by hand)

Name phrases so they match one of these. A brand-new segment needs three edits: module 5's expression, `SEGMENTS` and the templates in `outreach/Code.gs`, and a fresh Apps Script paste by the user.

## Phrase bank

Format: `<business type> in <city> FL`

- **Broward cities:** Fort Lauderdale, Hollywood, Pompano Beach, Coral Springs, Plantation, Weston, Davie, Sunrise, Hallandale Beach, Deerfield Beach, Parkland
- **Palm Beach cities:** West Palm Beach, Palm Beach, Palm Beach Gardens, Boca Raton, Delray Beach, Boynton Beach, Jupiter, Wellington, Lake Worth Beach
- **Miami-Dade (only when asked):** Miami, Miami Beach, Coral Gables, Brickell, Wynwood, Aventura, Doral
- **Planners:** wedding planner, luxury wedding planner, event planner, corporate event planner, event design company
- **Luxury residential:** luxury apartments, luxury high-rise apartments, luxury waterfront apartments
- **Boutique fitness:** pilates studio, reformer pilates studio, barre studio, indoor cycling studio, boutique fitness studio, boutique gym, yoga studio

Neighborhoods also work and avoid overlap between cities: "Las Olas", "Victoria Park", "Downtown Delray", "CityPlace".

## Rules to respect

- **Corporate HR contacts are not scrapable.** Google Maps has no HR names. They come from LinkedIn by hand.
- **Fitness studios are hand-picked.** The owner chooses studios and sets promo terms per studio before ticking "ready" in the leads tab. Scraped fitness rows are candidates only, and nothing sends until the user approves.
- **Skip big-box gyms.** Use "boutique" wording for gyms.
- **Never include prices, event dates, wizard zen, CBD or hemp wording.** Search phrases are only business types and places.
- **Duplicate protection is layered:** the Make lookup skips names already in "new leads", and the Apps Script hourly job deletes unreviewed repeats.
