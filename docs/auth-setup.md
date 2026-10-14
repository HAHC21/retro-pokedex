# Finish Google and Microsoft sign-in

The backend already implements OpenID Connect login for Google and Microsoft. You still need developer-console credentials and a local `.env` before either button will work.

Start the API from `backend/` so relative paths like `data/auth.sqlite3` resolve correctly.

## 1. Install the new Python packages

Uvicorn is probably already running. Stop it, then from `backend/`:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

New packages: `authlib` (OIDC client) and `itsdangerous` (signed session cookie).

## 2. Create `backend/.env`

Copy `backend/.env.example` to `backend/.env`.

Generate a session secret:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Paste that value into `SECRET_KEY`. Do not leave `dev-change-me` if you care about the cookie being guessable.

Keep these as-is for local Vite:

```
FRONTEND_ORIGIN=http://localhost:5173
AUTH_REDIRECT_BASE_URL=http://localhost:5173
```

OAuth must start and finish on **localhost:5173** (the UI), not on port 8000. The Vite proxy forwards `/api` to FastAPI so the `pokedex_session` cookie is stored for `localhost`. Use `localhost` everywhere; `127.0.0.1` is a different cookie host.

After saving `.env`, restart uvicorn.

## 3. Google Cloud OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or pick an existing one).
3. **APIs & Services → OAuth consent screen**.
   - User type: **External**.
   - App name: anything, e.g. `Pokédex Collection`.
   - User support email and developer contact: your Gmail.
   - Save. Scopes can stay at the defaults (`openid`, `email`, `profile` are requested by the backend).
   - Publishing status can stay **Testing**. Under **Test users**, add the Google accounts that should be allowed to sign in.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Name: `Pokédex local`.
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:5173/api/auth/google/callback`
5. Copy the client ID and client secret into `.env`:

```
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
```

Restart uvicorn. Confirm Google is live:

[http://localhost:5173/api/auth/providers](http://localhost:5173/api/auth/providers)

`google.enabled` should be `true`. Then open:

[http://localhost:5173/api/auth/google/login](http://localhost:5173/api/auth/google/login)

Sign in with a **test user**. You should land on the Pokédex with `?signed_in=1`. Then:

[http://localhost:5173/api/auth/me](http://localhost:5173/api/auth/me)

should return your `id`, `email`, and `name`.

If Google shows `redirect_uri_mismatch`, the URI in Credentials must match `http://localhost:5173/api/auth/google/callback` exactly (scheme, host, path, no trailing slash).

## 4. Microsoft Entra app registration

1. Open [Microsoft Entra admin center](https://entra.microsoft.com/) → **Identity → Applications → App registrations → New registration**.
2. Name: `Pokédex local`.
3. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts** (this matches `MICROSOFT_TENANT=common`).
   - Personal Microsoft accounts only: choose that option and set `MICROSOFT_TENANT=consumers` in `.env`.
4. Redirect URI:
   - Platform: **Web**
   - URI: `http://localhost:5173/api/auth/microsoft/callback`
5. Register.
6. **Certificates & secrets → New client secret**. Copy the **Value** immediately (it is shown once).
7. From **Overview**, copy **Application (client) ID**.
8. Put both in `.env`:

```
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_TENANT=common
```

Restart uvicorn. Check `/api/auth/providers` for `microsoft.enabled: true`, then open:

[http://localhost:5173/api/auth/microsoft/login](http://localhost:5173/api/auth/microsoft/login)

Same success URL (`?signed_in=1`) and `/api/auth/me` as Google.

## 5. What the backend already does

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/auth/providers` | Which providers have credentials |
| GET | `/api/auth/google/login` | Start Google sign-in |
| GET | `/api/auth/microsoft/login` | Start Microsoft sign-in |
| GET | `/api/auth/{provider}/callback` | OAuth callback (do not call this yourself) |
| GET | `/api/auth/me` | Current user (401 if the session cookie is missing) |
| POST | `/api/auth/logout` | Clear the session |

Users are stored in `backend/data/auth.sqlite3`. Google and Microsoft identities that share a **verified** email are linked to the same user.

The session cookie is `pokedex_session` (HTTP-only, SameSite=Lax, 14 days). Collection progress is still the old shared JSON / browser `localStorage`; it is not tied to these accounts yet.

## 6. Production later

- OAuth redirect URIs on `https://api.retropokedex.com/api/auth/{google|microsoft}/callback`, and JavaScript origins for `https://www.retropokedex.com` and `https://retropokedex.com`.
- `AUTH_REDIRECT_BASE_URL=https://api.retropokedex.com` and `FRONTEND_ORIGIN=https://www.retropokedex.com`.
- The API allows those site origins for CORS. Set `CORS_ORIGINS` only to add another browser origin.
- A new `SECRET_KEY`.
- SessionMiddleware `https_only=True` once you are on HTTPS.

Apple is not wired. Nintendo is not available without Nintendo’s developer program and a registered title.
