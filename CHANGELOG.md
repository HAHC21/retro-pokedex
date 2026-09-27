# Changelog

All notable changes to Retro Pokédex, taken from the versioned commits on `main`. v0.5 is the first release. Dates are the commit dates.

## [0.8.0] - 2026-09-27

### Added

- Header wordmark: `Wordmark` sets Retro in `--color-logo-ink` and Pokédex in `--color-logo-red`, with `LogoPokeBall` as the O. Hover or focus opens the lid. `--font-logo` is Orbitron. The PNG mark is unused.
- Welcome GIF on the dashboard. `DashboardView` picks `/pikachu-pokemon.gif` or `/jinx.gif` (Shinx) once per visit.
- Region boxes show a signature legendary via `DexRegion.mascots` and `randomRegionMascot`. Kanto is Articuno, Zapdos, Moltres, or Mewtwo.
- `spawnMapTabs` in `encounters.ts` builds a tab per spawn region. `RegionMap` takes `graph: RegionGraph | null`, `regions: RegionTab[]`, and `activeRegionId`. A region without a drawn map shows `detail.mapUnavailable`.
- Evolution lines and checklist evolve text cover gender, beauty, rain, console upside down, Attack vs Defense, a party species or type, and `Trade for {species}`. `_evolution_qualifiers` and `_detail_requirement_count` pick the method with the most requirements. `displayEvolutionCond` and the EN/ES `evo` catalog match.

### Changed

- A species page lists spawn locations for every region, not only the selected map. The map or the unavailable note stays on a narrow screen; `compactSpawns` is gone.
- `_attach_evolution` prefers live `_evolution_steps` from the cached chain. `_live_evolve_label` rebuilds the checklist evolve sentence from that chain, then falls back to a stored `evolve_label`.
- Acquisition cache key is `v5`.
- `--color-bg` is `#fefcfc`. `.blueprint.pk-welcome` is white. `.pk-mon-top` lays out the card-header Poké Ball.

## [0.7.9] - 2026-09-26

### Added

- My Collection at `/{game}/collection`. `CollectionView` and `CollectionToolbar` list every capturable form marked caught or shiny on any save. Mega Evolution and Gigantamax stay off the grid. `ownedMarks` unions those marks. A signed-in trainer also sees rows from `GET /api/collection/owned/index`.
- Header and phone menu: My Collection between Pokédex and Checklist. `ListView` includes `"collection"`. `pk-list-view` remembers it so Back on a species page returns to My Collection.
- Region, search, and All / Normal / Shiny / Alternate Forms / Variants. `originRegionSlug` treats a regional form as that region (Alolan Vulpix is Alola). Alternate Forms are capturable non-cosmetic forms. Variants are cosmetic looks such as Floette’s flower colors.
- An Ultra Ball on a collection card when an owned row has `source_type === "pk"`. `PokeBallIcon` accepts `kind: "ultra"`. The heading explains the icon.
- `GET /api/collection/owned/index` (`owned_index`). `OwnedIndexItem` / `OwnedIndexRead` (`pokemon_id`, `species_slug`, `form_slug`, `source_type`). `OwnedPokemonService.list_index` and `OwnedPokemonRepository.list_owned_index` project those fields, default limit 5000, cap 8000. `fetchOwnedIndex` in `collectionApi.ts`.
- `buildCollectionEntries`, `filterCollectionEntries`, `collectionHeadCopy`, and `collectionStatuses` in `collectionList.ts`. English and Spanish copy under `collection` and `nav.collection`.

### Changed

- The header game picker is hidden on Collection (`showGamePicker` excludes `view === "collection"`). Collection filter state stays in memory; the URL is only `/{game}/collection`.
- `PokemonCard` no longer draws NORMAL / SHINY / NORMAL + SHINY in the corner. `hasSpecimen` can show the Ultra Ball instead. Collection cards use `dimUncaught={false}` and `markedStyle={false}`.
- Last caught sprites go through `formSpriteRef` in `forms.ts`. A variant without catalog sprite data uses `form.name`.
- The planned “Your collection” section is removed from `ROADMAP` and `ROADMAP_ES`.

### Fixed

- `InfoTip` `keepPanelInView` shifts the panel horizontally and flips it above the button when it would leave the viewport.

## [0.7.8] - 2026-09-26

### Added

- English and Spanish for the site. `frontend/src/i18n` holds `en.ts`, `es.ts`, `I18nProvider`, and `readStoredLocale` (`pokedex-locale`). The header shows EN and ES. The phone menu lists English and Spanish. The document title, description, and Open Graph tags follow the locale.
- A language prompt on the dashboard. `LanguagePrompt` calls `detectLocationLanguage`, which reads the country from ipwho.is and offers Spanish for Spanish-speaking countries and English for English-speaking ones. Dismissing it stores `pokedex-lang-prompt-dismissed`.
- On a species page, the identity name, Pokédex flavor text, and overview follow the language. `speciesDisplayName` uses the species `names` entry. `flavorTextsForGame` prefers the active language and falls back to English. `overviewForLocale` prefers `overview.es` and falls back to `overview.en`.
- `PokemonOverviewDocument.overview_es`. `scripts.generate_overviews --lang es` writes the Spanish paragraph only after an English overview exists (`need-en` otherwise). The token CSV adds a `language` column. Spanish prompts use official Spanish type names and form names (`Gigamax`, `Mega-`, `de Alola`).
- `PokeProxyService` returns `overview` as `{en, es}` through `overview_texts`. `_project_species` keeps English and Spanish flavor text. `fetchMon` accepts a string or that object.
- On a narrow screen, Last caught renders as `pk-recent-list` instead of the card grid. The Pokédex toolbar and status filters stack. Checklist rows put actions on their own line. Species-page game tags use the full width. The game selector stacks, and the header language buttons hide in favor of the menu.

### Changed

- Nav, dashboard, dex and checklist filters, detail, marks, specimens, bulk import, auth, footer, types, stats, natures, games, versions, regions, evolution lines, acquisition fallbacks, matchup labels, and form names read from the active catalog. `displayEvolutionCond` rewrites stored English evolution phrases when the language is Spanish. `gameLabel`, `gameWayLabel`, and `versionLabel` use the catalog.
- The changelog and roadmap use `localizedChangelog` and `localizedRoadmap` in `frontend/src/i18n/narrative.ts`. Spanish changelog dates are day, month, year. Auth errors are stored as `confirm_failed` and `signin_failed` so the message can change with the language.
- `.cursor/rules/rebuild-docker.mdc` states that `docker compose up -d --build` may run without an approval prompt.

## [0.7.7] - 2026-09-26

### Added

- The move-game dialog lists only saves where that Pokémon can be caught, received, or evolved without a trade. `catchableGameKeys` keeps wild, starter, gift, static, snag, and event. A trade encounter or a trade evolution is left out. A regional-dex row still counts when encounter data is missing. Expansion versions map back onto Sword / Shield and Scarlet / Violet. Global Collection and the game the mark is already in stay listed.
- Checklist method text names a rod or field move when every wild encounter in that game needs one. `_wild_label` covers Old Rod, Good Rod, Super Rod, Rock Smash, Headbutt, Surf, Dive, and the other tool methods. Walking, rustling grass, and flower spots stay “Wild Encounter.”
- Evolution lines state every requirement. `_cond_text` includes high friendship, affection, time of day, location, a known move, and a known move type. Sylveon uses the friendship method that also requires a Fairy-type move.
- `.cursor/commands/changelog.md`, a repo command that updates the changelogs from version diffs.

### Changed

- Move-dialog choices are the same game tags as on a card. Long names stay on one line, and the selected tag uses an outline. The `.pk-assign-game` wrapper is gone.
- `acquisition()` builds method text from cached encounters, so a stored `pokemon_acquisition` row does not hide the new labels. The frontend cache key is `v4`.
- A species page reads evolution steps from the evolution collection via `_attach_evolution`.

## [0.7.6.1] - 2026-09-25

### Added

- Open tabs reload when a newer UI or API is deployed. The page checks on load, when the tab is focused, and about once a minute.
- The UI publishes its build id at `/version.json`. Dev uses the newest public changelog version. A production build appends its own id. `VITE_APP_VERSION` overrides that id.
- `GET /api/version` returns the API release id with `Cache-Control: no-store`. `APP_VERSION` wins, then `COMMIT_HASH`, then `backend/app/VERSION`.
- On App Platform, set `APP_VERSION` to `${_self.COMMIT_HASH}` on the API component so an API deploy refreshes open tabs.

## [0.7.6] - 2026-09-25

### Added

- Variants are tracked apart from alternate forms. A flower color such as Blue Floette is a variant. A form that plays differently, such as Eternal Floette, stays an alternate form. Each catchable one is marked on its own.
- `app.catalog.game_availability` lists the games a species or form can be met in, and how (wild, gift, event, Pokédex). A DLC dex stays on its own versions. Mega Evolution and Gigantamax list only the games where that mechanic exists for the species.
- On a Pokédex card, the game tag can move a mark, including shiny and gender, to another save without changing the game selector.
- Dashboard search. Two or more characters of a name, or a National Dex number, returns species, alternate forms, and variants.
- A roadmap page for Switch box screenshots, region maps still to draw, and Terastallization, linked from the footer.
- `docs/competitor_gaps.md`, an internal list of living-dex features this site does not have yet.

### Changed

- Caught forms show a colored Poké Ball on the evolution line and on each catchable form. Last caught keeps that form’s name and sprite.
- `scripts.set_capture` also inserts own-id variant rows (Eternal Floette, Rotom appliances, and the like). Shared forms such as Floette’s flower colors are not rows.
- Local Docker ports are 5110 for the API, 5120 for the UI, and 5130 for the dashboard.

## [0.7.5] - 2026-09-24

### Changed

- Account confirmation and password reset mail go through Resend instead of MailerSend SMTP. Messages use the HTML templates, with a plain-text fallback.
- `EMAIL_FROM` is `Pokédex <noreply@retropokedex.com>`.

### Added

- `scripts.test_resend` sends one test message with the Resend API key from `backend/.env`.

## [0.7.4] - 2026-09-24

### Added

- `starter` on the `rarity` field, for each main-series first partner and the rest of its line. `scripts.set_rarity` writes it alongside mythical, legendary, pseudo, and fossil.
- A rarity label on the species identity card, between the Pokédex number and the types, with a short explanation.

### Changed

- Fossil Pokémon use a bronze border, and starters use gray. The name and Pokédex number use the same color as the border.
- Pseudo-legendary violet covers the whole evolutionary line, not only the final stage.

## [0.7.3] - 2026-09-24

### Added

- A `rarity` field on each Pokémon row: `mythical`, `legendary`, `pseudo`, or `fossil`. Other species leave it empty. `scripts.set_rarity` writes the value, and every form of a species shares it.

### Changed

- Pokédex cards, checklist rows, and the species identity card use that field for a gold border on legendaries, a dark red border on mythicals, and a violet border on pseudo-legendaries.

## [0.7.2] - 2026-09-24

### Added

- Dashboard boxes for Mega Evolutions, Gigantamax, and Regional Forms. Each opens a Pokédex list of that form.
- A `capture` flag on each Pokémon row. Base species and regional forms can be caught; Mega and Gigantamax cannot. `scripts.set_capture` writes the flag and inserts missing Gigantamax rows.
- `GET /api/poke/forms` lists alternate forms and whether each one can be caught.

### Changed

- Mega and Gigantamax lists and species pages hide catch marks and show the colored sprite.
- Mega and Gigantamax species pages hide the Pokédex entry, abilities and natures, and the Spawns, Moves, and My Specimens sections.

## [0.7.1] - 2026-09-24

### Added

- A public changelog page at `/changelog`, linked from the footer.

### Changed

- Male and Female mark buttons appear only on a Pokémon’s page.

### Fixed

- The frontend and dashboard Vite configs declare `process` so `tsc -b` passes in production.

## [0.7.0] - 2026-09-24

### Added

- Docker images for the API, the Pokédex frontend, and a new admin dashboard, plus a `docker-compose.yml` for local runs.
- Admin API and dashboard for sign-in stats, backed by a login-event record on every successful password or OAuth sign-in.
- One database row per Pokémon form (base, Mega, regional, Gigantamax, and similar), with form-aware overviews, evolutions, spawns, and AI movesets.
- Scripts to link forms and migrate existing form keys.
- Gender-specific sprites, and form selection on the dex, checklist, detail, and owned-collection views.

## [0.6.9] - 2026-09-23

### Changed

- Homepage region browse is keyed by geographic region (Kanto through Paldea), separate from the generation a species was introduced in. Hisui’s new species stay with generation VIII.

## [0.6.8.4] - 2026-09-23

### Removed

- The dashboard “progress by game” list and the handler that opened a game from that list.

## [0.6.8.3] - 2026-09-23

### Changed

- Google Analytics loads only when `VITE_GA_MEASUREMENT_ID` is set on a production build.
- Added `frontend/.env.example`, `frontend/rules.md`, and `backend/rules.md`, and documented the analytics env on App Platform.

## [0.6.8.2] - 2026-09-23

### Changed

- Moved analytics out of `index.html` into `initAnalytics()`, and load it only on the deployed site.

## [0.6.8.1] - 2026-09-23

### Fixed

- OAuth redirects and email links use the public API and frontend origins, including `X-Forwarded-*` behind DigitalOcean App Platform. Registered redirect URIs stay on the configured provider URLs.

## [0.6.8] - 2026-09-23

### Added

- Static Pokémon sprites (normal and shiny) on the dex, checklist, and detail views. Grayscale-to-color on card hover is CSS.

## [0.6.7] - 2026-09-23

### Added

- Homepage region browse: Global Collection plus a generation scope, with matching dex toolbar and checklist filters.

## [0.6.6] - 2026-09-23

### Added

- `sync_pokeapi_refs` to warm ability and location payloads into the Mongo PokéAPI cache.

### Changed

- Dashboard and detail layout, and the App Platform / run notes for the reference sync.

## [0.6.5] - 2026-09-22

### Added

- Compiled Mongo tables for National Dex names, type membership, obtainability, evolutions, acquisitions, wild spawns, location labels, ability effects, and the detail-view payload.
- `compile_poke_tables` to build those tables from the cache. Read paths serve the compiled rows instead of per-id PokéAPI calls.

### Removed

- The design-handoff bundle under `design/`.

## [0.6.4.1] - 2026-09-22

### Changed

- Renamed the HOME save slot label to “Global Collection” in the game list and its help text.

## [0.6.4] - 2026-09-22

### Added

- Bulk National Dex obtainability index (obtain versions and `evolves_from`) from one Mongo read.
- Click-to-reveal info tips on the dashboard and dex toolbar.

### Changed

- PokéAPI cache reads can fetch many paths at once, and obtainability resolution stays local after the index loads.

## [0.6.3.6] - 2026-09-22

### Added

- DigitalOcean App Platform deploy notes, a script to copy the dev Mongo database onto production, and `apiUrl()` so the production SPA calls `https://api.retropokedex.com` while local dev keeps the Vite `/api` proxy.
- Browser-origin allowlist for the production API.

## [0.6.3.5] - 2026-09-22

### Added

- Open Graph, Twitter card, and JSON-LD metadata, plus a noscript summary, with canonical and image URLs filled from the current origin.

## [0.6.3.4] - 2026-09-22

### Changed

- Page title, description, and keywords aimed at search: collection tracker, stats, types, and spawn locations across every generation.

## [0.6.3.3] - 2026-09-22

### Added

- Google Analytics tag in the document head.

## [0.6.3.2] - 2026-09-22

### Fixed

- PK import gender lookup uses the parsed gender value directly instead of coercing it through `Number`.

## [0.6.3.1] - 2026-09-22

### Changed

- Google and Microsoft sign-in buttons are hidden behind `SHOW_OAUTH_PROVIDERS` (off). Email sign-in stays on the auth screen.

## [0.6.3] - 2026-09-21

### Added

- Kalos region map and route graph, including a Lumiose mirror helper.
- Version-exclusivity labels on the checklist when the selected save is a pair (for example X versus Y).
- Optional straight-line edges on region maps; omitted edges stay Manhattan.

### Changed

- Dex toolbar accepts a custom status list, and obtainability warms exclusivity for visible checklist rows.

## [0.6.2] - 2026-09-21

### Added

- Checklist view with a dex toolbar (search, status, and scope), caught/shiny mark toggles, and a list/grid preference.
- Acquisition lines that turn PokéAPI encounters and evolution details into a how-to-obtain sentence for the selected save.
- Scope filters for the National Dex, the regional dex, and the current game’s version group.

## [0.6.1] - 2026-09-21

### Changed

- Region maps share one visual scale (node size, route thickness, and label offset) based on Unova’s viewBox width, instead of a per-map `routeR`.
- Unlit cities use a lighter fill so they read on the map background.

## [0.6] - 2026-09-21

### Added

- Owned Pokémon: store a concrete specimen (IVs, EVs, moves, nature, origin, ball, and similar) from a `.pk*` import, including bulk import, edit, and delete.
- Per-game caught and shiny marks, separate from owned specimens.
- Smogon competitive sets (OU, then the generation dump) and optional Gemini moveset suggestions constrained to the learnset, plus generated species overviews.
- Account roles (`user`, `developer`, `admin`) assigned from email allowlists. Admin and developer share staff privileges.
- Password reset tokens and email delivery.
- Scripts to sync PokéAPI into Mongo and generate overviews.
- Favicon, apple touch icon, and wordmark assets.
- Specimen cards, move name tags, nature and origin-game helpers, and the owned-collection panel.

## [0.5] - 2026-09-20

Initial release.

### Added

- FastAPI backend with email auth, Google and Microsoft OIDC, and session handling.
- PokéAPI proxy with a Mongo cache, species and move repositories, learnsets, type matchups, regions, and version groups.
- User accounts in Mongo or SQLite.
- React app with sign-in, dashboard, National Dex, and species detail.
- Region maps and route graphs for Kanto, Johto, Hoenn, Sinnoh, and Unova, with encounter-based obtainability and a shortest-path helper.
- Caught-progress tracking and a `sync_moves` script.
- Local run notes and OIDC setup notes.
