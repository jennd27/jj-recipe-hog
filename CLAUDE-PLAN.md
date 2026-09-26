# Jennifer's Recipe App — Implementation Plan

## Context
A fully client-side "what can I cook with what's in my fridge" recipe app, hosted on GitHub Pages with no backend. Ten easy Indian recipes will be hand-compiled into a JSON file (ingredients + procedure + source link), ingested into the browser's own database on every page load, and a search form lets the user enter what ingredients they currently have to get recipes ranked by how complete a match they are.

Key decision already resolved during clarification: **WebSQL itself is deprecated/removed from browsers and must not be used.** Per the user's explicit choice, the app uses **plain IndexedDB** (no SQL layer) with matching/ranking logic written in JavaScript.

## Persistence note (the alert the user asked for)
IndexedDB **does** persist across reloads and browser restarts by default (same-origin storage, until the user manually clears site data) in Chrome/Firefox/Edge — indefinitely. The one caveat: Safari's Intelligent Tracking Prevention (ITP) can evict IndexedDB after ~7 days without a visit to the site. This is a non-issue here because the app re-ingests `data/recipes.json` fresh into IndexedDB on every load anyway (self-healing), so eviction just means the next visit repopulates it.

## Tech stack
- No build step: plain HTML/CSS/JS.
- **Fomantic UI** (CSS + JS from CDN, requires **jQuery**, also from CDN) for styling and components (form, dropdown/search for autocomplete, cards for results).
- Hosted as static files on GitHub Pages.

## Units
Only five allowed units, per user's decision: `l` (liter), `tbsp`, `cup`, `tsp`, `pcs`. US customary standard: 1 cup = 240 ml = 16 tbsp = 48 tsp; 1 tbsp = 15 ml = 3 tsp; 1 l = 1000 ml. `pcs` is a bare count and is never converted to/from the volume units.

`js/units.js` exposes the shared conversion table/helpers (`toBaseVolumeMl(amount, unit)`, `fromBaseVolumeMl(ml, unit)`), reused by both the search ranking and the converter widget.

## Converter widget
A small Fomantic UI form segment on the same page: enter a value in grams or ml, get the equivalent in cup/tbsp/tsp/l. Per user's decision, uses **water density (1 g ≈ 1 ml)** — labeled as an approximation, since true g→volume conversion needs per-ingredient density.

## Data layer

### `data/recipes.json` (source of truth, fetched via `fetch()` on load)
```json
[
  {
    "id": "chana-masala",
    "name": "Chana Masala",
    "url": "https://source-site.example/chana-masala",
    "image": "https://source-site.example/img/chana-masala.jpg",
    "procedure": "Independently-written step-by-step text (not copy-pasted verbatim from the source — ingredient lists/facts aren't copyrightable, but a site's exact prose is, so procedures are paraphrased/rewritten while the source link gives attribution).",
    "ingredients": [
      { "name": "chickpeas", "amount": 2, "unit": "cup" },
      { "name": "onion", "amount": 1, "unit": "pcs" }
    ]
  }
]
```
Ingredient names are kept canonical/consistent by hand while compiling this file (e.g. always "tomato", never "tomatoes"), since it's authored once, not user-entered.

### IndexedDB schema (`RecipeAppDB`)
- `recipes` — keyPath `id`: `id, name, url, image (optional), procedure`
- `ingredients` — keyPath auto-increment `id`, index on `recipeId` and on `name`: `id, recipeId, name (lowercase/trimmed), amount, unit`

### Ingest behavior (`js/ingest.js` + `js/db.js`)
On every page load: open/upgrade the DB, then clear and bulk-repopulate both object stores from `data/recipes.json`. This keeps the app always in sync with the JSON (per the "populated fresh every load" requirement) while IndexedDB still serves as the queryable, persisted local store the rest of the app reads from.

## Ingredient autocomplete
On the "what do I have" search form, each row is: amount (number) + unit (dropdown: l/tbsp/cup/tsp/pcs) + ingredient name using a **Fomantic UI Dropdown with search**, `allowAdditions: false`, options populated from the distinct `ingredients.name` values already sitting in IndexedDB after ingest. Restricting to a pick-list (rather than free text) is what prevents "tomato" vs "tomatoes" drift, per the user's requirement.

## Search / ranking algorithm (`js/search.js`)
Input: the user's list of `{name, amount, unit}` rows.

For each recipe, for each of its required ingredients:
- **Not present at all** in the user's list → counts as *missing*; its full required amount counts as deficit.
- **Present, same unit category** (both volume, or both `pcs`) → convert both to a common base (ml for volume units; raw count for `pcs`), `deficit = max(0, required - have)`. Deficit > 0 counts as *insufficient*.
- **Present, but unit categories differ** (e.g. recipe wants `cup`, user entered `pcs`) → not safely comparable, conservatively treated as *missing*.

Recipe score = `(missing + insufficient count, sum of per-ingredient deficits normalized as deficit/required)`. Normalizing avoids a large-quantity ingredient's shortfall dominating a small one's. Recipes are sorted ascending on that tuple: recipes you can fully make appear first, then recipes ranked by fewest/smallest shortfalls.

Results render as Fomantic UI cards: name, image, link to source, and a breakdown of which ingredients are covered / short / missing.

## File layout (`/home/node/jennifer-recipe-app`)
```
index.html                 (jQuery + Fomantic UI via CDN, search form, converter widget, results area)
css/app.css                (small overrides on top of Fomantic UI)
js/db.js                   (IndexedDB open/schema/clear+bulk-insert)
js/ingest.js               (fetch data/recipes.json, populate via db.js on load)
js/units.js                (unit conversion table/helpers, shared)
js/search.js               (ranking algorithm)
js/converter.js            (g/ml -> cup/tbsp/tsp/l widget logic)
js/app.js                  (DOM wiring: dynamic ingredient rows, Fomantic dropdown init, render results)
data/recipes.json          (10 easy Indian recipes)
```

## Implementation steps
1. Scaffold the file layout above; wire up jQuery + Fomantic UI CDN includes in `index.html`.
2. Research 10 easy Indian recipes (WebSearch/WebFetch), compile `data/recipes.json`: extract ingredients and convert each one's original amount into `l/tbsp/cup/tsp/pcs`, write a short independently-worded procedure, keep source `url` + optional `image`, keep ingredient names canonical across all 10 recipes.
3. Implement `js/units.js` conversion helpers.
4. Implement `js/db.js` (open/upgrade `RecipeAppDB`, `recipes` + `ingredients` stores with `name` index, clear+bulk-insert).
5. Implement `js/ingest.js` (fetch JSON, call `db.js` on page load).
6. Implement `js/app.js`: dynamic add/remove ingredient rows, Fomantic UI dropdown autocomplete sourced from distinct ingredient names in the DB, form submit handling.
7. Implement `js/search.js` per the ranking algorithm above.
8. Render ranked results as Fomantic UI cards with covered/short/missing breakdown.
9. Implement `js/converter.js` (g/ml → cup/tbsp/tsp/l, water density) as its own form segment.
10. Manual end-to-end test in a browser.

## Verification
- Serve the directory over http(s) (e.g. `python3 -m http.server` from `/home/node/jennifer-recipe-app`) — `fetch()` for `recipes.json` needs a server, not `file://`.
- DevTools → Application → IndexedDB → `RecipeAppDB`: confirm `recipes`/`ingredients` populate on first load.
- Reload the page: confirm the DB is still present and re-synced without duplicate rows (clear+repopulate each load).
- Enter a sample "have" list and confirm: recipes needing exactly those ingredients rank first; recipes with partial matches rank by shortfall size; recipes missing everything sort last.
- Sanity-check the converter against known values (e.g. 240 g → 1 cup, 15 g → 1 tbsp under the water-density assumption).
