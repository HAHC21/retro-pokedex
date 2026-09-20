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

Populate the move catalog once (or after PokéAPI updates) from `backend/`:

```powershell
.\.venv\Scripts\Activate.ps1
python -m scripts.sync_moves
```

Optional: `python -m scripts.sync_moves --limit 50` for a short test run.

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
- Optional `EMAIL_DELIVERY=resend` + `RESEND_API_KEY`: send real mail via [Resend](https://resend.com)’s free tier (limited daily volume). Keep `EMAIL_FROM` on a verified domain (or Resend’s onboarding address while testing).

Flow: create account → open confirmation link → log in. Unconfirmed accounts cannot log in.

Do not commit `backend/.env` or `atlas-credentials.env`.
