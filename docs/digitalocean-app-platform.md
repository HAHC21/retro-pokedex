# Deploy on DigitalOcean App Platform

Add this as a **new app** on the DigitalOcean account that already runs your other services. Give it its own app so its hostname and routes stay separate from those services.

This app is two pieces that must be served from **one public hostname**:

| Piece | Source | What App Platform runs |
| --- | --- | --- |
| Web UI | `frontend/` | Static site. Vite build output is `frontend/dist`. Production builds call `https://api.retropokedex.com`. Dev still uses relative `/api` through the Vite proxy. |
| API | `backend/` | Python web service. FastAPI listens on `/api`, including `GET /api/health`. |

Client routes such as `/home/dex/gen/1` are handled by React Router. The static site must fall back to `index.html` for unknown paths. API routes must keep the `/api` prefix, because that is the path FastAPI serves.

Users, collection marks, owned Pokémon, and the PokéAPI cache live in MongoDB. The container disk is ephemeral, so the API needs `MONGODB_URI` before it will start.

## Before you start

- Use the team you already deploy from. The app name must be unique on that team (`pokedex` is free unless you already used it). Put it in the same region as the database it will use, and next to the other apps when that matches.
- The GitHub or GitLab account is already connected. If this repository is missing from the list, grant the existing DigitalOcean Git integration access to it.
- Point `MONGODB_URI` at a database this account can already reach, or at a Managed MongoDB cluster on the same team. Use the database name already in your URI (this project’s local data is the `pokedex` database) when the deployed app should see data you have already synced.
- Google or Microsoft sign-in needs OAuth clients whose redirect URIs you can edit. Password sign-in needs the mail provider you already use (`smtp` or `resend`). `EMAIL_DELIVERY=console` only prints links in API logs.

Generate a session secret locally and keep it for the `SECRET_KEY` variable:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

## 1. Create the app

1. Open **Apps** → **Create App**, the same way you add any other app on this account.
2. Choose the GitHub or GitLab connection already on the team, then this repository and the branch you want to deploy.
3. DigitalOcean will suggest one component. Change the setup so the app has **two** components from the same repo: a web service and a static site. Both use the same branch. Set each component’s source directory as below.

## 2. API web service

| Setting | Value |
| --- | --- |
| Name | `api` |
| Type | Web Service |
| Source directory | `backend` |
| Environment | Python |
| Run command | `uvicorn app.main:app --host 0.0.0.0 --port 8080` |
| HTTP port | `8080` |
| Instance | 1 × Basic (1 vCPU, 1 GB is a reasonable start) |
| Health check path | `/api/health` |

The Python buildpack installs `backend/requirements.txt` on its own. Leave the build command empty.

App Platform sets `PORT` to the HTTP port (`8080`). The run command binds that port on all interfaces. The health check calls the container directly, so the path is `/api/health` (the route FastAPI exposes).

The current buildpack defaults to Python 3.13, which this API can run. To pin a version, add `backend/runtime.txt` containing one line such as `python-3.13.12`, then redeploy. Supported versions are listed in DigitalOcean’s [Python buildpack](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/python/) docs.

## 3. Web static site

| Setting | Value |
| --- | --- |
| Name | `web` |
| Type | Static Site |
| Source directory | `frontend` |
| Environment | Node.js |
| Build command | Leave empty. The Node.js buildpack runs `npm run build`, which is already `tsc -b && vite build`. |
| Output directory | `dist` |
| Index document | `index.html` |
| Catchall document | ` ` |

The catchall is required. Without it, refreshing `/home/pokemon/25` returns a 404 from the static host.

The Node.js buildpack defaults to Node 22, which matches this Vite app. To pin it, add an `engines` field to `frontend/package.json`:

```json
"engines": {
  "node": "22.x"
}
```

A second custom build command runs *after* `npm run build`. Leave that field empty so the UI is built once.

## 4. Routes

Production calls `https://api.retropokedex.com` directly, so the frontend app does not need an `/api` route. The table below applies only when one app serves both the site and the API.

| Path | Component | Preserve path prefix |
| --- | --- | --- |
| `/api` | `api` | **On** |
| `/` | `web` | Off |

Preserve path prefix is required on `/api`. App Platform otherwise strips the matched prefix before forwarding. A request to `/api/auth/me` would arrive at the API as `/auth/me`, and FastAPI would 404. With the flag on, the API still receives `/api/auth/me`.

`/api` is more specific than `/`, so API calls reach the Python service and every other path reaches the static site.

## 5. Environment variables

Set these on the **api** component (run time). Mark secrets as **Secret** so they are encrypted. Do not commit them.

Set `FRONTEND_ORIGIN` and `AUTH_REDIRECT_BASE_URL` with **no trailing slash**. They are different hosts: the site and the API.

| Variable | Secret | Value |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Mongo connection string. Include the database in the path, for example `mongodb+srv://USER:PASSWORD@HOST/pokedex?retryWrites=true&w=majority`. |
| `SECRET_KEY` | Yes | The random string from the start of this doc. |
| `FRONTEND_ORIGIN` | No | Site origin, `https://www.retropokedex.com`. Sign-in redirects back here. |
| `AUTH_REDIRECT_BASE_URL` | No | API origin, `https://api.retropokedex.com`. OAuth callbacks and email links are `{this}/api/auth/...`. A trailing slash makes the callback `https://api.retropokedex.com//api/auth/...`, which will not match the provider. |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client id, if you use Google. |
| `GOOGLE_CLIENT_SECRET` | Yes | Google client secret. |
| `MICROSOFT_CLIENT_ID` | No | Entra application (client) id, if you use Microsoft. |
| `MICROSOFT_CLIENT_SECRET` | Yes | Entra client secret value. |
| `MICROSOFT_TENANT` | No | `common`, or `consumers` for personal Microsoft accounts only. |
| `EMAIL_DELIVERY` | No | `smtp` or `resend` for real mail. `console` writes the link to logs. |
| `EMAIL_FROM` | No | A sender on a domain your mail provider has verified. |
| `SMTP_HOST` | No | For example `smtp.mailersend.net`. |
| `SMTP_PORT` | No | `587` |
| `SMTP_USERNAME` | Yes | SMTP user. |
| `SMTP_PASSWORD` | Yes | SMTP password. |
| `SMTP_USE_TLS` | No | `true` |
| `RESEND_API_KEY` | Yes | Only when `EMAIL_DELIVERY=resend`. |
| `GEMINI_API_KEY` | Yes | Optional. Enables AI movesets. |
| `GEMINI_MODEL` | No | Optional. Default in code is `gemini-3.5-flash-lite`. |
| `ADMIN_EMAILS` | No | Optional comma-separated emails promoted to admin on login. |
| `DEVELOPER_EMAILS` | No | Optional comma-separated emails promoted to developer on login. |

Leave `CORS_ORIGINS` unset. The API allows `https://www.retropokedex.com`, `https://retropokedex.com`, and `FRONTEND_ORIGIN` on its own. Set `CORS_ORIGINS` only to add another browser origin, as a JSON array:

```text
["https://your-other-origin.example"]
```

Redeploy the API after changing variables. `MONGODB_URI` is read at process start; an empty value makes the container exit before the health check can pass.

### MongoDB network access

Use the same access pattern as your other apps that talk to this database. A new app is a new client, so add it the way you added the others.

**Atlas (or any external cluster).** If those apps already use a [dedicated egress IP](https://docs.digitalocean.com/products/app-platform/how-to/manage-egress-ips/), assign one to this app and allow that address. If the cluster already allows the account’s App Platform traffic (including `0.0.0.0/0` with username, password, and TLS), this app can use that same rule.

**DigitalOcean Managed MongoDB.** Add this app as a trusted source on the existing cluster, or bind a cluster already on the team. Put the connection string in `MONGODB_URI`, or declare the database in the app spec and bind `${db.DATABASE_URL}`. Confirm the URI path is the database you intend (`/pokedex` when you are reusing existing data). Use the private URL when the app and database are in the same VPC.

## 6. OAuth redirect URIs

After the app has a public URL, add that origin in each provider. Replace `https://YOUR_APP` with the real origin (default `*.ondigitalocean.app` host, or your custom domain).

**Google Cloud Console** → your OAuth client:

- Authorized JavaScript origins: `https://www.retropokedex.com` and `https://retropokedex.com`
- Authorized redirect URI: `https://api.retropokedex.com/api/auth/google/callback`

**Microsoft Entra** → your app registration → Authentication → Web redirect URI:

- `https://api.retropokedex.com/api/auth/microsoft/callback`

Match the scheme, host, and path exactly. Then set `FRONTEND_ORIGIN` to `https://www.retropokedex.com` and `AUTH_REDIRECT_BASE_URL` to `https://api.retropokedex.com`, and redeploy the API.

Local redirect URIs (`http://localhost:5173/...`) can stay on the same client or on a separate client used only for development.

## 7. Load catalog data

The API proxies PokéAPI and caches responses in MongoDB. A fresh database works, and the first views will be slower until the cache fills. To warm it, run the sync scripts **once from your machine** against the production URI. Do not attach them as a deploy job; a full sync is long and would run on every push. Re-run `sync_pokeapi` only about every 6 months or when a new game releases. After a warm (or when derived schemas change), run `compile_poke_tables` to rebuild API working-set tables from cache — that step does not call PokéAPI.

From `backend/`, with the production `MONGODB_URI` in the environment (and `GEMINI_API_KEY` only for the overview script):

```powershell
python -m scripts.sync_pokeapi
python -m scripts.compile_poke_tables
python -m scripts.sync_moves
python -m scripts.generate_overviews
```

## 8. Custom domain

Attach a hostname on a domain this account already manages, the same way your other apps do. A subdomain such as `pokedex.example.com` keeps this app off the hostnames those services already use.

1. On this app, open **Networking** → **Domains** and add that hostname. Create the CNAME or A records DigitalOcean shows, in the DNS zone you already use.
2. Wait until the certificate is active.
3. Set `FRONTEND_ORIGIN` to the site origin and `AUTH_REDIRECT_BASE_URL` to `https://api.retropokedex.com` (no trailing slash).
4. Add the site origins and `https://api.retropokedex.com/api/auth/.../callback` URIs in Google and Microsoft.
5. Redeploy.

## 9. Deploy from an app spec

If `doctl` is already authenticated against this account, you can create the app from a spec instead of the control panel. Save the spec below as `.do/app.yaml`, replace `YOUR_GITHUB_USER/pokedex` and `main`, and set `region` to the region your other apps use. Then:

```powershell
doctl apps create --spec .do/app.yaml
```

Add secret values in the control panel after the app exists, or with `doctl apps update`. The placeholders below are not real secrets.

```yaml
name: pokedex
region: nyc
features:
  - buildpack-stack=ubuntu-22

services:
  - name: api
    github:
      repo: YOUR_GITHUB_USER/pokedex
      branch: main
      deploy_on_push: true
    source_dir: backend
    environment_slug: python
    run_command: uvicorn app.main:app --host 0.0.0.0 --port 8080
    http_port: 8080
    instance_count: 1
    instance_size_slug: apps-s-1vcpu-1gb
    health_check:
      http_path: /api/health
    envs:
      - key: MONGODB_URI
        value: REPLACE_ME
        scope: RUN_TIME
        type: SECRET
      - key: SECRET_KEY
        value: REPLACE_ME
        scope: RUN_TIME
        type: SECRET
      - key: FRONTEND_ORIGIN
        value: https://www.retropokedex.com
        scope: RUN_TIME
        type: GENERAL
      - key: AUTH_REDIRECT_BASE_URL
        value: https://api.retropokedex.com
        scope: RUN_TIME
        type: GENERAL
      - key: EMAIL_DELIVERY
        value: smtp
        scope: RUN_TIME
        type: GENERAL
      - key: EMAIL_FROM
        value: "Pokédex <noreply@your-verified-domain.example>"
        scope: RUN_TIME
        type: GENERAL

static_sites:
  - name: web
    github:
      repo: YOUR_GITHUB_USER/pokedex
      branch: main
      deploy_on_push: true
    source_dir: frontend
    environment_slug: node-js
    output_dir: dist
    index_document: index.html
    catchall_document: index.html

ingress:
  rules:
    - component:
        name: api
        preserve_path_prefix: true
      match:
        path:
          prefix: /api
    - component:
        name: web
      match:
        path:
          prefix: /
```

`deploy_on_push: true` rebuilds that component when you push the tracked branch.

To bind a Managed MongoDB cluster already on this team, add a `databases` entry with `production: true` and that cluster’s `cluster_name`, then point `MONGODB_URI` at `${db.DATABASE_URL}`. A dev database (below) provisions a separate cluster and is only for a throwaway database:

```yaml
databases:
  - name: db
    engine: MONGODB
    production: false

# on the api service envs:
# - key: MONGODB_URI
#   value: ${db.DATABASE_URL}
#   scope: RUN_TIME
```

See the [App spec reference](https://docs.digitalocean.com/products/app-platform/reference/app-spec/) for the bindable variable names.

## 10. Check the deployment

Use the live URL, not localhost.

1. `https://YOUR_APP/api/health` returns `{"status":"ok"}`.
2. `https://YOUR_APP/` loads the Pokédex.
3. Open a deep link such as `https://YOUR_APP/home/dex/gen/1` and refresh. The same screen loads again.
4. `https://YOUR_APP/api/auth/providers` shows `google.enabled` and `microsoft.enabled` according to the credentials you set.
5. Sign in. You should land back on the site with a session. `https://YOUR_APP/api/auth/me` returns your user while that session exists.
6. Open a Pokémon that needs PokéAPI data and confirm the page fills in.

This adds one web service to the team’s existing App Platform bill. The static site component has no instance charge. A new Managed MongoDB cluster would be a separate charge; reusing a cluster you already run does not add one.

## Troubleshooting

| What you see | What to change |
| --- | --- |
| Deploy stays unhealthy, logs say `MONGODB_URI is not set` | Set `MONGODB_URI` on the **api** component and redeploy. |
| Logs say the database timed out or is not reachable | Atlas IP allowlist or the Managed Database trusted source does not include this app. See the MongoDB network section. |
| `/api/health` is 404, while `/health` works | Turn **preserve path prefix** on for the `/api` route. |
| Refreshing a Pokémon or dex URL returns 404 | Set the static site catchall document to `index.html`. |
| Google or Microsoft says `redirect_uri_mismatch` | The provider URI must be exactly `https://api.retropokedex.com/api/auth/{google\|microsoft}/callback`. `AUTH_REDIRECT_BASE_URL` must be `https://api.retropokedex.com` with no trailing slash. |
| Sign-in returns to the site and the session is missing | `FRONTEND_ORIGIN` must be `https://www.retropokedex.com`. The session cookie is set by `api.retropokedex.com`; the UI sends it with `credentials: "include"`. |
| Password sign-up never sends mail | `EMAIL_DELIVERY=console` only logs the link. Set `smtp` or `resend` and a verified `EMAIL_FROM`. |
| UI build fails on Node | Pin `"engines": { "node": "22.x" }` in `frontend/package.json`. |

The session cookie is `pokedex_session` (HTTP-only, SameSite=Lax, 14 days). It is a signed cookie, so more than one API instance can serve the same session as long as they share `SECRET_KEY`. In `backend/app/main.py` the cookie is created with `https_only=False`, so browsers do not get the Secure flag. Traffic on App Platform is HTTPS either way. Set `https_only=True` in that middleware before you treat the deployment as production.
