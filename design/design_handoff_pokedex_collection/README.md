# Handoff: Retro Pokédex — Collection Tracker

## Overview

A single-page web app for collectors to track which Pokémon they have caught, per game save and globally, in **normal** and **shiny** form separately. All Pokémon data (names, sprites, types, stats, evolutions, forms, game appearances) comes from the public **PokéAPI**; the user's own progress is stored locally in the browser.

Views inside one app shell: **Dashboard**, **Pokédex grid**, **Pokémon detail**, plus **Sign In** and **Log In**.

## About the Design Files

The files in `design/` are **design references created in HTML** — a working prototype showing intended look and behavior. They are **not production code to copy directly**.

The prototype is authored in a proprietary streaming-component format (`.dc.html`: an HTML template with `{{ }}` holes plus a logic class, driven by `support.js`). Do not try to reuse that runtime. The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, SwiftUI, native, etc.) using its established patterns, router, state library and component primitives. If no codebase exists yet, pick the most appropriate framework and implement there.

What to mine from the prototype: exact copy, layout structure, the design tokens it consumes, the data-fetching strategy, and the progress data model — all of which are documented below.

To view the prototype: open `design/Pokedex Collection.dc.html` in a browser (needs internet access for PokéAPI and the Barlow web fonts).

## Fidelity

**High fidelity.** Colors, typography, spacing and interactions are final and come from a bound design system ("Industry"). Recreate the UI pixel-accurately using the codebase's own primitives, mapping the tokens in *Design Tokens* below onto whatever token layer the codebase already has. Type-tag colors are the one deliberate exception to the design system's mono palette and must be kept.

---

## Screens / Views

All three views share one app shell.

### Shell (persistent)

- **Purpose**: identity, the active game selector, and view switching.
- **Layout**: full-height flex column, `min-height: 100vh`, background `--color-bg`. Header bar: horizontal flex, `space-between`, `align-items: center`, `flex-wrap: wrap`, padding `13.6px 20.4px`, bottom border `1px solid --color-divider`.
  - Left: the wordmark — `RETRO` in Silkscreen 700, 19px, transparent-filled with a 3.5px `--color-accent-800` text stroke (white fill, hollow letters), then `POKÉDEX` in Silkscreen 700, 19px, `--color-text`, 4px apart. On hover the whole wordmark runs a looping multicolor gradient: `RETRO` drops its stroke and fills with a 300%-wide 6-stop rainbow (`#ff4d6d → #ffb400 → #35d07f → #2f9bff → #a855f7 → #ff4d6d`) animated by `background-position` over 1.4s linear infinite with `background-clip: text`; `POKÉDEX` stays black at all times. `background-clip: text` must be set at rest too, or the gradient paints as a solid box.
  - Right: two buttons, `Dashboard` and `Pokédex`, then a hairline divider and two more, `Sign In` and `Log In`. The game `<select>` is NOT in the header — it sits in the content area (see below).
- **Button states**: active = solid `--color-accent` fill, white text, `1px solid --color-accent-700`; inactive = transparent, text `--color-accent-800`, `1px solid --color-divider`. Square corners (`border-radius: 0`), Barlow Condensed 600, uppercase, `letter-spacing: .08em`. The Pokédex button reads as active in both the grid and the detail view.
- **Game selector row**: directly under the header, inside the same 1400px container, right-aligned — a `GAME` label (10px, `.18em`, uppercase, neutral-600) + `<select>` (min-width 190px) listing all games. Shown on every view except Sign In / Log In. There is no footer.
- Every interactive element gets `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`.

### 1. Dashboard

- **Purpose**: see overall completion, what was caught most recently, and jump into a game or region.
- **Layout**: centered column, `max-width: 1400px`, padding `27.2px 20.4px`, `gap: 27.2px` between sections. Dashboard, Pokédex, Pokémon detail and the game-selector row all share this same 1400px container and padding.

Sections, in order:

1. **KPI row** — `grid`, `repeat(auto-fit, minmax(180px, 1fr))`, gap 13.6px. Four blueprint cells, padding 20.4px each:
   - Label (10px, `.18em`, uppercase, neutral-600), value (Barlow Condensed 600, 44px, `line-height: 1`, `--color-accent-800`), sub-line (12px, neutral-700).
   - Cards: **Registered** — value = count of Pokémon with any mark in any game; sub `of 1025 in the National Pokedex`. **Completion** — `round(registered/total*100)%`; sub `<n> left to catch`. **Shiny** — count of distinct shiny-marked Pokémon; sub `<n> tracked as normal`. **Active game** — count marked in the selected game; sub `Caught in <game label>`.
2. **Last caught** — heading `LAST CAUGHT` (Barlow Condensed 600, 24px, uppercase, `.06em`) with right-aligned note `MOST RECENT MARKS ACROSS EVERY GAME` (11px, `.14em`, uppercase, neutral-600). A SINGLE row of up to 6 cards: `grid-auto-flow: column`, `grid-auto-columns: minmax(0, 1fr)`, gap 13.6px, `overflow: hidden` — the row never wraps and never scrolls. Each card is a clickable blueprint cell (padding 13.6px, column flex, gap 6.8px) containing: dex number (11px, `.12em`, tabular-nums, neutral-600) and a kind tag on the same row; sprite (max-width 92px, centered); name (Barlow Condensed 600, 18px, uppercase); game label (12px, neutral-700); relative time (10px, `.14em`, uppercase, `--color-accent-700`). Shiny marks show the shiny sprite.
   - Kind tag: `Normal` = bg `--color-accent-100`, text `--color-accent-800`, `1px solid --color-accent-600`. `Shiny` = bg `--color-accent-900`, white text, same-color border. Both 10px, `.12em`.
   - Empty state: one full-width blueprint cell, padding 27.2px, centered 13px `.14em` uppercase neutral-600 text — `Nothing marked yet — open the Pokédex to start`.
3. **Progress by generation** — heading + note `REGISTERED ACROSS EVERY GAME`. A fixed 3-column grid (`repeat(3, minmax(0, 1fr))`, gap 20.4px) of nine clickable blueprint boxes, each padding 27.2px, `min-height: 210px`, column flex with `justify-content: space-between`. Contents top to bottom: region name (Barlow Condensed 600, 30px, uppercase) with `GEN <roman>` right-aligned (11px, `.16em`, uppercase, neutral-600); the percentage (Barlow Condensed 600, 52px, `line-height: 1`, `--color-accent-800`, tabular-nums); a single 14px bar — track `--color-neutral-200` with hairline border, fill `--color-accent-600` at registered % (no hatch overlay); then a baseline row with `<caught> / <total>` (15px, tabular-nums, neutral-700) on the left and `SHINIES: <n>` (11px, `.16em`, uppercase, `--color-accent-800`) right-aligned. Clicking a box opens the grid at that region. Game names are deliberately not shown here.
4. **Progress by game** — heading + right note `ACTIVE GAME: <label>`. One blueprint cell (padding `13.6px 20.4px`) with one row per game that has progress, plus the active game even at zero. Row: `grid-template-columns: minmax(140px,1.4fr) minmax(110px,1fr) 1fr auto`, gap 13.6px, bottom border hairline, `border-left: 3px solid var(--color-accent)` when active (transparent otherwise). Columns: game name (Barlow Condensed 600, 17px, uppercase) over scope (`<Region> · Gen <roman>`, or `National` for HOME); 10px bar (same treatment, no hatch); `<caught> / <total>` tabular-nums; `<n> shiny` (11px, `.12em`, uppercase, `--color-accent-800`, right-aligned, min-width 68px). Clicking a row switches the active game (and region) and opens the grid.
5. **Shortcuts** — `grid`, `repeat(auto-fit, minmax(240px, 1fr))`, gap 13.6px. Three clickable blueprint cells (padding 20.4px): kicker `SHORTCUT` (10px `.18em` uppercase neutral-600), title (Barlow Condensed 600, 20px, uppercase), body (13px, neutral-700).
   - `Pick up where I left off` / `Open the current region: <Region>.` → grid, filters untouched.
   - `See what is missing` / `Filter the region to Pokemon with no mark yet.` → grid with status = Missing.
   - `My shinies` / `Only the shinies recorded in this region.` → grid with status = Shiny.

### 2. Pokédex grid (primary view)

- **Purpose**: browse a region and mark normal/shiny in one tap.
- **Layout**: centered column, `max-width: 1400px`, padding 20.4px, gap 20.4px.
- **Toolbar**: horizontal flex, `align-items: flex-end`, gap 13.6px, wraps.
  - `REGION / GENERATION` select (min-width 180px), options `<Region> · Gen <roman>` for all nine generations.
  - `SEARCH` field (`type="search"`, flex `1 1 240px`, placeholder `Name or number`) — matches name substring (case-insensitive) or dex number substring.
  - Segmented control, four buttons: `All`, `Missing`, `Normal`, `Shiny`. Active = solid `--color-accent`, white text; inactive = transparent, neutral-700 text, hairline border. 12px Barlow Condensed 600, `.1em`, uppercase, padding `8px 12px`, square corners.
- **Section header**: `<Region> · <active game label>` (Barlow Condensed 600, 26px, uppercase, `.05em`) with right-aligned `<generation games> · <n> of <total> shown` (12px, `.1em`, uppercase, neutral-700), separated by a hairline bottom border.
- **Grid**: `repeat(auto-fill, minmax(168px, 1fr))`, gap 13.6px. Each cell is a blueprint cell, padding 13.6px, column flex, `justify-content: space-between`:
  - Top row: `#0001`-style padded dex number (11px, `.12em`, tabular-nums, neutral-600) and a status badge right-aligned in `--color-accent-800` (`NORMAL`, `SHINY`, or `NORMAL + SHINY`).
  - Sprite: max-width 104px, centered, `loading="lazy"`. Unmarked = `opacity: .55; filter: grayscale(1)`.
  - Name: Barlow Condensed 600, 18px, uppercase, `line-height: 1.1`.
  - Type tags (see *Type tags*), min-height 20px row, gap 3.4px, wrapping.
  - Cross-game note (10px, `.12em`, uppercase, `--color-accent-700`, min-height 13px): `In another game` when the Pokémon is marked in some other save but not the active one.
  - Toggle row: two buttons in a `1fr 1fr` grid, gap 6.8px, labelled `Normal` and `Shiny`. Unset = transparent with hairline border, neutral-700 text; `Normal` set = solid `--color-accent` + white; `Shiny` set = solid `--color-accent-900` + white. 12px Barlow Condensed 600, `.1em`, uppercase, padding `5px 6px`, square corners.
  - Marked cells (either mark) get `border-color: --color-accent-600` and `background: --color-accent-100`.
  - Clicking anywhere in the upper (non-toggle) part opens the detail view.
- **Loading state**: centered 13px `.14em` uppercase neutral-600 line, `Loading index from PokéAPI…`, while the index is fetched.
- **Empty state**: `No results for these filters`, same treatment.

### 3. Pokémon detail

- **Purpose**: verify the Pokémon and mark it without leaving the entry.
- **Layout**: centered column, `max-width: 1180px`, padding 20.4px, gap 20.4px.
- **Top actions**: three boxed uppercase buttons in the inactive header-button style (transparent, `1px solid --color-divider`, `--color-accent-800` text, square corners, padding `8px 14px`, 13px) — `← Back to Pokédex`, `← #0024 Arbok`, `#0026 Raichu →`. Previous/Next show the adjacent Pokémon's padded dex number and name, and step the dex number clamped to 1…1025.
- **Loading state**: `Loading entry…` (same centered treatment as the grid).
- **Row 1** — `repeat(auto-fit, minmax(280px, 1fr))`, gap 20.4px, two blueprint cells (padding 20.4px):
  - **Identity card**: dex number (Barlow Condensed, 15px, `.12em`, neutral-600, tabular-nums) beside the name (`h1`, Barlow Condensed 600, 42px, `line-height: 1`, uppercase); type tags; a `1fr 1fr` pair of sprite figures (normal / shiny, each max-width 170px with a 10px `.18em` uppercase neutral-600 caption); the two mark buttons at 14px / padding `9px 10px` reading `Mark normal` → `✓ Normal` and `Mark shiny` → `✓ Shiny`; then a hairline-topped block: `MARKS IN <GAME> — NORMAL AND SHINY ARE TRACKED SEPARATELY` (10px `.18em` uppercase neutral-600) over either `Recorded in: <game> · <game>` or `Not recorded in any game` (13px, neutral-700).
  - **Base stats card**: heading `BASE STATS` (Barlow Condensed 600, 20px, uppercase, `.06em`); six rows of `grid-template-columns: 96px 1fr 40px`, gap 10.2px — label (11px, `.12em`, uppercase, neutral-700), 10px bar (track neutral-200 + hairline, fill `--color-accent-600` at `min(100, stat/180*100)%`), value (13px, tabular-nums, right). Then a hairline-topped `TOTAL` row with the stat sum, and a 12px neutral-700 line `Height <h> m` / `Weight <w> kg` (PokéAPI decimetres/hectograms ÷ 10).
  - Stat labels: `HP`, `Attack`, `Defense`, `Sp. Atk`, `Sp. Def`, `Speed`.
- **Row 2** — full-width blueprint cell, heading `DEFENSIVE MATCHUPS`, then `repeat(auto-fit, minmax(200px, 1fr))` groups: `Very weak ×4`, `Weak ×2`, `Resists`, `Immune`. Each group = 10px `.18em` uppercase neutral-600 label, a wrapping row of type tags, and `None` (12px neutral-600) when the group is empty.
- **Row 3** — a second full-width blueprint cell with the identical structure, heading `OFFENSIVE MATCHUPS`, groups `Super effective ×4`, `Super effective ×2`, `Not very effective`, `No effect`. These are the multipliers this Pokémon's own types deal TO each defending type — for dual types take the BEST (max) multiplier across its two types, not the product.
- **Row 4 — Where it spawns** (full-width blueprint cell): heading `WHERE IT SPAWNS` with right-aligned note `WILD ENCOUNTER LOCATIONS BY REGION`. Holds the Kanto route graph (below) when applicable, then `repeat(auto-fit, minmax(260px, 1fr))` region columns. Each column: a hairline-underlined header row with the region name (Barlow Condensed 600, 17px, uppercase) and `Gen <romans>` right-aligned (10px, `.14em`, uppercase, neutral-600); then one row per location, `grid-template-columns: 1fr auto` — place name (14px) over the games it appears in (10px, `.1em`, uppercase, neutral-600), with the best encounter rate right-aligned (12px, tabular-nums, `--color-accent-800`). Fallback line when there are no wild encounters: `No wild encounters recorded — obtained by evolution, trade, gift or event`.
- **Row 3** — `repeat(auto-fit, minmax(300px, 1fr))`, gap 20.4px:
  - **Evolution line**: heading `EVOLUTION LINE`; wrapping row of 110px-wide clickable cells (hairline border, padding 10.2px): 72px sprite, name (Barlow Condensed 600, 15px, uppercase), condition text (11px, neutral-600, centered, `line-height: 1.25`). Clicking loads that Pokémon's entry.
  - **Right column** (stacked, gap 20.4px): **Alternate forms** — its own blueprint cell, heading `ALTERNATE FORMS`, non-default varieties as neutral tags, fallback `No alternate forms listed`. Below it, **Games** — its own blueprint cell, heading `GAMES`, one row per generation that the Pokémon appears in: a fixed 46px-wide `GEN <roman>` label (10px, `.14em`, uppercase, neutral-600, `flex: 0 0 auto`, pinned top-left) beside a wrapping row of outline tags, one per title, which flows onto as many lines as needed (`flex: 1 1 0; min-width: 0`). Titles must be correctly cased — FireRed, LeafGreen, HeartGold, SoulSilver, Omega Ruby, Alpha Sapphire, Ultra Sun, Ultra Moon, Let's Go, Pikachu!, Let's Go, Eevee!, Brilliant Diamond, Shining Pearl, Legends: Arceus. Fallback `PokéAPI lists no games for this Pokémon`.

---

### 4. Sign In / Log In

One shared card view, two copy variants. Centered blueprint cell, padding 27.2px, `max-width: 460px`, column flex, gap 20.4px:

- Kicker (10px, `.18em`, uppercase, neutral-600), title (`h1`, Barlow Condensed 600, 38px, uppercase), one-line body (14px, neutral-700).
- Two provider buttons, full width, transparent with `1px solid --color-divider`, square corners, padding `12px 13.6px`, Barlow Condensed 600 15px uppercase `.06em`, each with its brand mark at 18px: Google (4-color G) and Microsoft (4-square logo).
- A rule with `OR WITH EMAIL` centered (10px, `.18em`, uppercase, neutral-600).
- Email and password fields in the standard `.field` + `.input` pattern, then a solid `--color-accent` submit button.
- A hairline-topped footer row: alt prompt (13px, neutral-700) and a ghost button to the other view.
- A ghost `Continue without an account` at the bottom left, returning to the Dashboard.

Copy — **Sign In**: `NEW TRAINER` / `SIGN IN` / "Create an account to sync your marks across devices." / `Sign in with Google` / `Sign in with Microsoft` / `Create account` / "Already registered?" → `Log in`. **Log In**: `WELCOME BACK` / `LOG IN` / "Pick up your collection on any device." / `Log in with Google` / `Log in with Microsoft` / `Log in` / "No account yet?" → `Sign in`.

No authentication is wired up — these are visual only. Implement against whatever identity provider the codebase uses (OAuth via Google and Microsoft at minimum).

---

## Kanto route graph

Inside **Where it spawns**, shown only when the Pokémon has at least one Kanto encounter. A metro-diagram of the region — deliberately schematic, not a reproduction of any in-game map.

- **Frame**: a relatively-positioned wrapper, `max-width: 1040px`, `aspect-ratio: 108 / 92`, centered, with an absolutely-positioned SVG (`viewBox="-4 6 108 92"`) filling it. Above the header: `KANTO ROUTE GRAPH` (Barlow Condensed 600, 17px, uppercase) with `<n> locations in Kanto` right-aligned (10px, `.14em`, uppercase, `--color-accent-800`).
- **Edges**: `<polyline>` with 90° elbows — from A to B, bend at `(Ax, By)` when the vertical distance is greater, else `(Bx, Ay)`; draw a straight line when either delta is under 0.4. Grey `--color-neutral-300` at 0.6 stroke width; an edge touching a spawn location turns `--color-accent` at 0.9.
- **Nodes**: routes are circles (r 2.6) with their number centered inside; cities are diamonds (a 3.4-unit rotated square drawn as a `<polygon>`); caves, forests and other landmarks are 4.4-unit squares. All carry a blue outline — `--color-accent-600` when unlit, `--color-accent-900` when lit — with `--color-bg` fill unlit and `--color-accent` fill lit.
- **Labels are HTML, not SVG.** Absolutely-positioned spans over the SVG, placed from the same coordinates as percentages: `left = (x + 4) / 108 * 100%`, `top = (y - 6) / 92 * 100%`. Route numbers sit centered on the node (7.5px, 700, tabular-nums; white when lit, neutral-700 when not); unlit city and landmark names sit above (9px, neutral-700); lit nodes get a pill BELOW reading `<Place>: <rate>%` (9px, 700, white on `--color-accent-900`, padding `2px 7px`). The pill is hidden entirely on unlit nodes. Note for the rebuild: this design's runtime cannot render text inside SVG `<text>`, which is why labels are HTML — a production implementation may use SVG text if its stack allows.
- **Data**: two plain tables. `KANTO_NODES` maps a PokéAPI location id → `[x, y, label, kind]` on a 0–100 grid, where kind is 0 route / 1 city / 2 landmark (45 entries). `KANTO_EDGES` is a list of id pairs (48 entries). `LOC_ALIAS` folds PokéAPI's variant location names onto node ids (`kanto-sea-route-19` → `kanto-route-19`, `pokemon-tower` → `lavender-town`, `silph-co` → `saffron-city`, and so on). Adding a region means adding two more tables; the renderer is unchanged.
- **Validate node keys against PokéAPI when entering a new region**: `GET /region/{id}` → `locations[].name`. Several plausible-looking keys are wrong (`power-plant` is really `kanto-power-plant`), and a mismatch silently fails to light.
- The user intends to replace the PokéAPI encounter feed with a hand-compiled local dataset later; keep the map renderer independent of the data source.

---

## Type tags

The only chromatic departure from the design system: each type reads in its own hue, as a light fill with darker same-hue text **and** border. 10px, `letter-spacing: .1em`, square corners, `1px` border, padding from the design system's `.tag`.

| Type | Background | Text + border |
| --- | --- | --- |
| Normal | `#ecece9` | `#5c5c52` |
| Fire | `#fdeadf` | `#a4441a` |
| Water | `#e2edfb` | `#2f5d9e` |
| Electric | `#faf2d4` | `#846513` |
| Grass | `#e6f4e0` | `#3a7529` |
| Ice | `#e1f3f5` | `#276b71` |
| Fighting | `#f8e3e1` | `#9a382d` |
| Poison | `#f1e6f6` | `#763683` |
| Ground | `#f4ecdc` | `#856025` |
| Flying | `#eaeefb` | `#4b5798` |
| Psychic | `#fce6ee` | `#a4365f` |
| Bug | `#eef3d9` | `#61741c` |
| Rock | `#f1ebdd` | `#786536` |
| Ghost | `#eae7f5` | `#564686` |
| Dragon | `#e6e9fa` | `#413b98` |
| Dark | `#e8e6e4` | `#46403c` |
| Steel | `#e9edf0` | `#48606e` |
| Fairy | `#fbe8f1` | `#9f3a73` |

---

## Interactions & Behavior

- **View switching** is client-side state, no page loads. Header buttons go to Dashboard / Pokédex; grid cards and evolution cells open the detail view; the detail view's back button returns to the grid with filters intact.
- **Marking**: `Normal` and `Shiny` are two independent booleans. Marking one never sets or clears the other. Marks apply to the **active game** only; the union across games drives global stats. A Pokémon counts as *registered* if either mark is set.
- **Filters**: `All` (no filter), `Missing` (neither mark in the active game), `Normal` (normal marked), `Shiny` (shiny marked). Search and status filters combine; both reset when a dashboard shortcut sets them.
- **Sprite swap**: a grid cell with a shiny mark shows the shiny sprite; otherwise the normal sprite.
- **Relative time** on Last caught cards: `Today`, `Yesterday`, `<n> days ago` under 30 days, otherwise a localized short date; marks saved before timestamping existed show `Date not recorded`.
- **Loading**: the Pokédex index shows a loading line on first run; the detail view shows one while its three requests resolve. Sprites are lazy-loaded.
- **Errors**: fetch failures fall through to the empty/loaded state rather than blocking the UI. Recommended for production: an explicit retry affordance and an offline notice.
- **Responsive**: every grid is `auto-fit`/`auto-fill` with `minmax`, and toolbars wrap; there are no fixed widths. Works from narrow phone widths up.
- **Hover/pressed**: come from the design system — accent tint on hover, one ramp step past base when pressed. Keyboard focus is a 2px accent ring at 2px offset.

## State Management

App state (all client-side):

- `view`: `"dash" | "dex" | "mon" | "signin" | "login"`
- `gen`: 1–9, the region shown in the grid
- `game`: active game key (see *Games*)
- `q`: search string
- `status`: `"all" | "missing" | "normal" | "shiny"`
- `id`: dex number open in the detail view
- `index`: `{ names: {id: name}, types: {id: [typeName]} }` — the cached dex index
- `indexLoading`: boolean
- `mon`: `{ data, species, evo, enc }` for the open entry; `monLoading`: boolean
- `prog`: the user's progress (persisted)

**Progress data model** (persisted to `localStorage`, key `pokedex-progress-v2`):

```json
{
  "<gameKey>": {
    "<dexId>": { "caught": true, "caughtAt": 1748900000000, "shiny": false, "shinyAt": null }
  }
}
```

`caught` means "owns a normal one in that game"; `shiny` is independent. `caughtAt` / `shinyAt` are epoch milliseconds set when a mark is turned on and cleared when turned off. Reads should skip any top-level value that isn't a game map (legacy flat data). Derived values (totals, per-generation and per-game progress, Last caught) are computed from this, never stored.

For production, a server-side account with the same shape is the obvious upgrade; keep local storage as the offline cache.

## Data fetching (PokéAPI, https://pokeapi.co/api/v2)

- **Index, once, cached** under `localStorage` key `pokedex-index-v2`:
  - `GET /pokemon?limit=1025` → names in dex order (index + 1 = dex number).
  - `GET /type/<name>` for all 18 types → membership lists, inverted into `id → [types]`. This is 18 requests instead of 1025 per-Pokémon ones; the UI renders names first and fills types in as each type resolves. Types arrive unordered (the type endpoint doesn't expose slot), which the design tolerates.
- **Detail, per Pokémon**: `GET /pokemon/<id>` (types, stats, height, weight, `game_indices`), `GET /pokemon-species/<id>` (varieties, evolution-chain URL), `GET /evolution-chain/<id>` (walked depth-first into a flat list with a condition string per step).
- **Encounters, per Pokémon**: `GET /pokemon/<id>/encounters`. Filter out Pokécenter stubs by location-area name, and filter `encounter_details` by `method.name` — drop anything matching `gift`, `only-one`, `trade`, `starter`, `squirt-bottle`, `wailmer-pail`; an entry with no surviving details is dropped. Without this filter, gift and event entries show as 100% "spawns".
- **True region per encounter**: `GET /location-area/{name}` → `location.url` → `GET /location/{name}` → `region.name`, cached by area and by location. Do NOT infer the region from the game's generation — remakes (FireRed/LeafGreen, HeartGold/SoulSilver, Omega Ruby/Alpha Sapphire, Brilliant Diamond/Shining Pearl) break that assumption and put Kanto routes under Sinnoh.
- **Sprites**: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/<id>.png` and `.../pokemon/shiny/<id>.png`. For production, mirror these rather than hot-linking GitHub.
- **Evolution conditions** are assembled from `evolution_details[0]`, joined with ` · `: `Level <n>`, item name, `Holding <item>`, `Friendship <n>`, `Daytime`/`Night`, location, `Knows <move>`, `Trade`, else the trigger name. First node is labelled `Base`.
- **Type effectiveness** is computed client-side from a hard-coded 18×18 attacking chart, multiplying each attacking type across the defender's types (the prototype's chart is in the logic class; reuse the values as-is).

## Games

Key → label → scope (the scope decides the denominator: its generation's range, or the full 1025 for HOME).

`rb` Red / Blue (Gen I) · `y` Yellow (I) · `gs` Gold / Silver (II) · `c` Crystal (II) · `rs` Ruby / Sapphire (III) · `e` Emerald (III) · `frlg` FireRed / LeafGreen (III) · `dp` Diamond / Pearl (IV) · `pt` Platinum (IV) · `hgss` HeartGold / SoulSilver (IV) · `bw` Black / White (V) · `b2w2` Black 2 / White 2 (V) · `xy` X / Y (VI) · `oras` Omega Ruby / Alpha Sapphire (VI) · `sm` Sun / Moon (VII) · `usum` Ultra Sun / Ultra Moon (VII) · `swsh` Sword / Shield (VIII) · `bdsp` Brilliant Diamond / Shining Pearl (VIII) · `pla` Legends: Arceus (VIII) · `sv` Scarlet / Violet (IX) · `home` HOME (global collection, National).

Generation ranges: I 1–151 Kanto · II 152–251 Johto · III 252–386 Hoenn · IV 387–493 Sinnoh · V 494–649 Unova · VI 650–721 Kalos · VII 722–809 Alola · VIII 810–905 Galar · IX 906–1025 Paldea.

## Design Tokens

From the Industry design system (`design/_ds/industry-.../styles.css` — the authoritative source; its `readme.md` documents intent).

**Colors**: bg `#f2f2f3` · surface `#e9e9ea` · text `#1d1f20` · accent `#5980a6` · divider `color-mix(in srgb, #1d1f20 16%, transparent)`.

Neutral ramp 100→900: `#f5f5f8` `#e7e7ea` `#d4d4d7` `#b7b7ba` `#98989b` `#7a7a7d` `#5d5d60` `#424244` `#2b2b2d`.

Accent ramp 100→900: `#eef6ff` `#d6ebff` `#b5d9fd` `#94bce3` `#749dc4` `#597ea3` `#416180` `#2c455d` `#1d2d3d`.

**Spacing** (0.85× scale): 3.4 · 6.8 · 10.2 · 13.6 · 20.4 · 27.2 px (`--space-1/2/3/4/6/8`).

**Radius**: 2 / 4 / 7 px — but this design is square-cornered: cards, buttons, tags and figures all use `border-radius: 0`.

**Shadows**: `--shadow-sm` `0 1px 2px rgba(43,43,45,.14)` · `md` `0 3px 10px rgba(43,43,45,.16)` · `lg` `0 12px 32px rgba(43,43,45,.22)`. This design uses none — structure is drawn with hairlines.

**Type**: headings `Barlow Condensed` 600; body `Barlow`; the wordmark `Silkscreen` 700 (Google Fonts, OFL) — used ONLY for the logo. Sizes used: 44 / 42 / 26 / 24 / 22 / 20 / 18 / 17 / 15 / 14 / 13 / 12 / 11 / 10 px. Uppercase labels carry `letter-spacing` between `.1em` and `.18em`. Numerals in stat/progress positions use `font-variant-numeric: tabular-nums`.

**Blueprint frame** — the system's signature and this design's main container: transparent background, `1px solid --color-divider`, square corners, and four `+` registration marks at the corners (design-system class `.blueprint` plus four `<i class="corner tl|tr|bl|br">` children; see `styles.css`). Do not fill these containers or round them, and do not drop the corner marks. Recreate this as one reusable component in the target codebase.

## Assets

- **Sprites**: PokéAPI sprite repository (see *Data fetching*). Nintendo/Game Freak/The Pokémon Company own these; for anything public-facing, confirm usage rights or replace them.
- **Fonts**: Barlow and Barlow Condensed (Google Fonts, OFL), loaded by the design system stylesheet.
- **Icons**: none in the current design. If any are added, the system specifies Lucide at stroke-width 1.5.
- No raster images or illustrations are bundled.

## Files

- `design/Pokedex Collection.dc.html` — the full prototype: template markup (all views) plus the logic class holding the type chart, generation/game/version tables, the Kanto node and edge tables, PokéAPI calls, progress model and all derived values.
- `design/support.js` — the prototype runtime. Reference only; not for production.
- `design/_ds/industry-a434e93a-488f-41b3-90ff-abe06a5cff0b/styles.css` — design tokens and component classes (`.btn`, `.tag`, `.input`, `.card`, `.blueprint`, `.nav`, `.table`, `.seg`).
- `design/_ds/industry-a434e93a-488f-41b3-90ff-abe06a5cff0b/readme.md` — the design system's own guide: direction, color/type rules, do's and don'ts.
- `design/_ds/industry-a434e93a-488f-41b3-90ff-abe06a5cff0b/_ds_bundle.js` — design system runtime bundle (reference only).
