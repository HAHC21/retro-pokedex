# Run the Pokedex

You need two terminals: one for the Python API and one for the React UI. Start the backend first.

Prerequisites: Python 3.11+, Node.js 18+, and a MongoDB Atlas connection string.

## Backend

1. Copy credentials into `backend/.env`. From the repo root you can use `atlas-credentials.env` as the source — set `MONGODB_URI` to the Atlas SRV URI with database name `/pokedex` and query params, for example:

   `mongodb+srv://USER:PASS@cluster.../pokedex?retryWrites=true&w=majority`

2. In Atlas → Network Access, allow your current IP (or `0.0.0.0/0` for casual local dev).

3. From `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

On macOS/Linux, activate the venv with `source .venv/bin/activate` instead.

API: [http://127.0.0.1:8000](http://127.0.0.1:8000)  
Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

Pokémon data for the SPA is served under `/api/poke/*` and cached in Atlas for about **30 days** (cache-on-read from PokéAPI). Entry detail is `/api/poke/pokemon/{id}`; wild spawn maps load separately from `/api/poke/pokemon/{id}/spawns`; learnsets are `/api/poke/pokemon/{id}/moves?game=…` (methods from the Pokémon payload, type/power from the Mongo `moves` catalog). Regional dex lists are assembled with a Mongo aggregation over flattened pokedex rows.

Pre-fill the PokéAPI cache (species, Pokémon, encounters, evolution chains, types, regional dex lists) from `backend/`. Rows that already exist in Mongo are skipped:

```powershell
.\.venv\Scripts\Activate.ps1
python -m scripts.sync_pokeapi
python -m scripts.sync_pokeapi --start 1 --end 151
python -m scripts.sync_pokeapi --id 25
```

Use `--force` to refetch. Optional `--delay` (default `0.05`) pauses after each network call. Location-area payloads used by spawn maps are still filled on first visit.

Populate the move catalog once (or after PokéAPI updates) from `backend/`:

```powershell
.\.venv\Scripts\Activate.ps1
python -m scripts.sync_moves
```

Optional: `python -m scripts.sync_moves --limit 50` for a short test run.

### Pokémon lore overviews

Gemini can fill a Mongo `pokemon_overviews` collection (one ~150-word paragraph per National Dex species). From `backend/`:

```powershell
.\.venv\Scripts\Activate.ps1
python -m scripts.generate_overviews --id 1
python -m scripts.generate_overviews --start 1 --end 50
python -m scripts.generate_overviews
```

Requires `GEMINI_API_KEY` and `MONGODB_URI`. Existing rows are skipped unless you pass `--force`. Use `--dry-run` to preview without writing. Uses `GEMINI_MODEL` (default `gemini-3.5-flash-lite`). No pause between successful generations by default; on errors it waits **60s** and retries the same species. Optional `--delay` if you need throttling.

Each Gemini call’s `usageMetadata` is written to `backend/data/overview_token_usage.csv` (`prompt_tokens`, `candidates_tokens`, `thoughts_tokens`, `total_tokens`). The file is recreated at the start of each run. Force-regenerate for a full cost ledger:

```powershell
python -m scripts.generate_overviews --force
```

### Recommended movesets (Moves tab)

- **Smogon competitive sets** are fetched from [data.pkmn.cc](https://data.pkmn.cc) (attributed to Smogon). No API key required; responses are cached in Mongo.
- **AI suggestions** use Google Gemini. Add to `backend/.env`:

```env
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-3.5-flash-lite
```

Get a key at [Google AI Studio](https://aistudio.google.com/apikey). Default model is `gemini-3.5-flash-lite` (fallbacks include `gemini-3.6-flash-lite` / `gemini-3.6-flash` when available). Without the key, the AI section shows an unavailable message; Smogon sets still work. AI picks are constrained to that Pokémon’s learnset for the selected game.

Suggestions are stored in Mongo (`pokemon_ai_movesets`, keyed by Pokémon + game) and reused on later visits. Admins and developers can force a Gemini refresh from the Moves tab. Elevate accounts with comma-separated emails in `.env`:

```env
ADMIN_EMAILS=you@example.com
DEVELOPER_EMAILS=dev@example.com
```

Roles are `user` (default), `developer`, and `admin`. Allowlisted emails are elevated on login/register and are never auto-demoted.

## Frontend

From `frontend/`:

```powershell
npm install
npm run dev
```

UI: [http://localhost:5173](http://localhost:5173)

The Vite dev server proxies `/api` to the backend on port 8000. The UI does not call pokeapi.co directly for dex data.

## Google and Microsoft sign-in

The API implements OAuth (users stored in the same Atlas database). Follow [auth-setup.md](auth-setup.md): create `backend/.env`, then register Google and Microsoft apps. Until those secrets are set, `GET /api/auth/providers` reports each provider as disabled.

## Email / password accounts

Email signup works without any paid mail service.

- Default `EMAIL_DELIVERY=console`: the confirmation link is written to the API server log and returned in the register response so the UI can show it. Zero cost.
- `EMAIL_DELIVERY=smtp` (alias `mailersend`) + `SMTP_*`: send real mail over STARTTLS. MailerSend example:

```env
EMAIL_DELIVERY=smtp
EMAIL_FROM=Pokédex <noreply@your-trial-or-verified-domain.mlsender.net>
SMTP_HOST=smtp.mailersend.net
SMTP_PORT=587
SMTP_USERNAME=MS_...@....mlsender.net
SMTP_PASSWORD=mssp....
SMTP_USE_TLS=true
```

  Keep `EMAIL_FROM` on a domain MailerSend has verified (trial domains look like `test-….mlsender.net`).
- Optional `EMAIL_DELIVERY=resend` + `RESEND_API_KEY`: send via [Resend](https://resend.com)’s HTTP API instead.

Flow: create account → open confirmation link → log in. Unconfirmed accounts cannot log in.

## Collection marks (caught / shiny)

When signed in, marks sync to Mongo (`user_collection_marks`, keyed by user + game + Pokémon). On login, local `localStorage` progress is merged with the server copy (union: either side marked stays marked). Guests still use browser-only `pokedex-progress-v2` storage.

Authenticated endpoints:

- `GET /api/collection/progress`
- `PUT /api/collection/progress` (`mode=merge|replace`)
- `PUT /api/collection/marks/{game}/{pokemon_id}`

## Owned Pokémon (sav / PK uploads — schema ready)

Mongo collections prepared for concrete owned Pokémon (separate from dex marks):

- `user_pokemon_imports` — upload batch metadata (`.sav` / `.pk*`, status, game/format hints)
- `owned_pokemon` — individual instances (ability, nature, IVs/EVs, moves, OT, box/party slot, import link)

Signed-in users can already add multiple specimens per species/game via the detail page (`Your specimens`): each entry stores shiny/normal, ability, nature, and separate IVs/EVs. Collected abilities/natures are highlighted on the traits panel. Creating/removing specimens updates dex marks for that game. Upload/parse API for sav/PK files is not wired yet.

Authenticated endpoints:

- `GET /api/collection/owned?pokemon_id=&game=`
- `POST /api/collection/owned`
- `PATCH /api/collection/owned/{owned_id}`
- `DELETE /api/collection/owned/{owned_id}`

