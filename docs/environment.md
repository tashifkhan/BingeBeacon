# Environment Variables

BingeBeacon reads a **single root `.env`** for both the Go API and the web PWA.

```bash
cp .env.example .env
ln -sfn ../.env web/.env.local   # so Vite sees the same file in local dev
```

How the values reach each side:

| Side | Mechanism | Timing |
| --- | --- | --- |
| Go API | `godotenv` + Viper `AutomaticEnv`; `database.host` maps to `DATABASE_HOST`, `jwt.secret` to `JWT_SECRET`, and so on (`internal/config/config.go`) | **runtime** — restart to apply |
| Web PWA | Vite; only `VITE_`-prefixed variables are exposed to browser code | **build time** — rebuild to apply |

> Anything named `VITE_*` ends up in the JavaScript bundle and is publicly
> readable. Never put a secret behind that prefix. Firebase web config values
> are *designed* to be public; the service account JSON is not.

Quoting rule: if a value contains spaces, quote it —
`MOVIEGLU_AUTHORIZATION="Basic dXNlcjpwYXNz"`.

---

## 1. Server

| Variable | Default | Required | Notes |
| --- | --- | --- | --- |
| `SERVER_PORT` | `8080` | no | Port the Go API listens on. |
| `SERVER_ENVIRONMENT` | `development` | no | `development` \| `production`. Compose forces `production` for the `api` service. |
| `SERVER_CORS_ORIGINS` | `http://localhost:3000` | yes in prod | Comma-separated allowed origins. Set to your public origin, e.g. `https://shows.example.com`. Not needed when the PWA is same-origin behind Caddy. |
| `SERVER_INTERNAL_API_KEY` | *(empty)* | yes in prod | Guards `/api/internal/sync/*`. Generate: `openssl rand -hex 32`. Empty means the sync endpoints reject every call. |
| `APP_ADDRESS` | `:80` | no | Caddy site address. Use a bare hostname (`shows.example.com`) to get automatic HTTPS via Let's Encrypt. |

## 2. Database (PostgreSQL 16+)

| Variable | Default | Required | Notes |
| --- | --- | --- | --- |
| `DATABASE_HOST` | `localhost` | yes | Compose overrides this to `postgres` inside the network. |
| `DATABASE_PORT` | `5432` | no | |
| `DATABASE_USER` | `postgres` | yes | Also seeds the `postgres` container's superuser. |
| `DATABASE_PASSWORD` | *(empty)* | **yes** | Prod compose refuses to start if unset. `openssl rand -base64 24`. |
| `DATABASE_DBNAME` | `bingebeacon` | yes | Also seeds the container's initial database. |
| `DATABASE_SSLMODE` | `disable` | no | `disable` on the compose network; `require` or `verify-full` for a managed/remote database. |

The API runs `migrations/` on startup (`db.RunMigrations` in
`cmd/server/main.go`) and exits non-zero if they fail — no manual migrate step
is needed for a normal deploy.

## 3. Redis 7+

| Variable | Default | Required | Notes |
| --- | --- | --- | --- |
| `REDIS_ADDR` | `localhost:6379` | yes | Compose overrides to `redis:6379`. |
| `REDIS_PASSWORD` | *(empty)* | recommended | If set, the prod compose Redis starts with `--requirepass` using the same value. |
| `REDIS_DB` | `0` | no | Logical DB index. |

Used for response caching and rate limiting. The API starts without Redis but
degrades to uncached upstream calls.

## 4. JWT

| Variable | Default | Required | Notes |
| --- | --- | --- | --- |
| `JWT_SECRET` | `development-only-secret-change-me` | **yes** | 32+ random characters. `openssl rand -base64 48`. Rotating it invalidates every existing session. |
| `JWT_ACCESS_TOKEN_TTL` | `15m` | no | Go duration string. |
| `JWT_REFRESH_TOKEN_TTL` | `168h` | no | Refresh tokens rotate on use; the PWA holds them in an HttpOnly cookie. |

---

## 5. External APIs — where to get each key

### TMDB — required (core catalog)

Search, trending, popular, imports, seasons/episodes, and watch providers all
come from TMDB. Without it the app has no content.

1. Create an account at <https://www.themoviedb.org/signup>.
2. Verify your email, then go to **Settings → API**
   (<https://www.themoviedb.org/settings/api>).
3. Request a key — choose **Developer**, accept the terms, and fill in the
   form (a personal/non-commercial description is accepted).
4. Copy the **API Key (v3 auth)** — a 32-character hex string.

```env
TMDB_API_KEY=<32-char v3 key>
TMDB_BASE_URL=https://api.themoviedb.org/3
```

> BingeBeacon uses **v3** keys (passed as an `api_key` query parameter), not the
> longer v4 Read Access Token (a JWT starting with `eyJ`). Using the v4 token
> here produces `401 Invalid API key`.

Free tier, no billing. Rate limit is roughly 50 req/s.

### OMDb — optional (IMDb/Rotten Tomatoes ratings)

Enriches shows with IMDb and Rotten Tomatoes ratings. Omit it and rating badges
are simply absent.

1. Go to <https://www.omdbapi.com/apikey.aspx>.
2. Pick the **FREE** tier (1,000 requests/day), enter your email, submit.
3. Click the activation link in the email — the key is inactive until you do.

```env
OMDB_API_KEY=<8-char key>
OMDB_BASE_URL=https://www.omdbapi.com
```

### TheTVDB — optional (episode air-date backfill)

Fills in air dates TMDB is missing, which improves alert accuracy for niche
shows.

1. Register at <https://thetvdb.com/auth/register>.
2. Go to <https://thetvdb.com/dashboard/account/apikey> and create a **v4**
   API key.
3. Choose the licence model:
   - **Project/company key** → key only, leave `THETVDB_PIN` empty.
   - **User-supported key** → each end user supplies a subscriber PIN; put yours
     in `THETVDB_PIN`.

```env
THETVDB_API_KEY=<v4 api key>
THETVDB_PIN=
THETVDB_BASE_URL=https://api4.thetvdb.com/v4
```

### MovieGlu — optional (cinema showtimes)

Powers `/api/v1/showtimes/*`. This is a **commercial** API — there is no
self-serve free tier; you request access and they issue credentials.

1. Apply at <https://www.movieglu.com/contact-us/> (a sandbox/dev account is
   usually granted for evaluation).
2. They send back four things: an **API key**, a **client ID**, HTTP Basic
   credentials, and your **territory** code.
3. Base64 the Basic credentials yourself:
   ```bash
   printf '%s' 'username:password' | base64
   ```

```env
MOVIEGLU_API_KEY=<x-api-key header value>
MOVIEGLU_CLIENT_ID=<client header value>
MOVIEGLU_AUTHORIZATION="Basic <base64 of user:pass>"
MOVIEGLU_TERRITORY=US        # ISO territory: US, GB, IN, ...
MOVIEGLU_BASE_URL=https://api.movieglu.com
```

The client sends `client`, `x-api-key`, `authorization`, `territory`,
`api-version: v200`, `device-datetime`, and `geolocation`
(`internal/metadata/movieglu/client.go`). Sandbox accounts often only return
data for a fixed sample geolocation.

---

## 6. Firebase Cloud Messaging

Two halves of one Firebase project: the **Admin SDK** (backend, secret) and the
**Web SDK** (frontend, public). Push notifications are optional — the API logs
`FCM initialization failed` and keeps serving the in-app notification inbox.

Create the project once at <https://console.firebase.google.com/> → **Add
project** (Google Analytics not required).

### 6a. Backend — service account

1. **Project settings** (gear) → **Service accounts**.
2. **Generate new private key** → confirm → a JSON file downloads.
3. Save it as `secrets/firebase-credentials.json` in the repo root. The compose
   file mounts `./secrets` read-only at `/app/secrets` and points
   `FCM_CREDENTIALS_FILE` at it. `secrets/` is gitignored.

| Variable | Default | Notes |
| --- | --- | --- |
| `FCM_CREDENTIALS_FILE` | `firebase-credentials.json` | Path *as seen by the API process*. Compose overrides it to `/app/secrets/firebase-credentials.json`. For local `go run`, keep the file at the repo root. |

> This JSON grants send-as-your-project rights. Never commit it, never ship it
> to the browser. If leaked, revoke the key in **Service accounts → Manage
> service account permissions**.

### 6b. Frontend — web app config

1. **Project settings → General → Your apps** → **`</>`** (Web) → register an
   app (Firebase Hosting not needed).
2. Copy the `firebaseConfig` object it shows you:

| Config field | Variable |
| --- | --- |
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |

3. **Project settings → Cloud Messaging → Web Push certificates** →
   **Generate key pair**. Copy the **public** key (starts with `B`, ~87 chars)
   into `VITE_FIREBASE_VAPID_KEY`. Do not use the private key.

These are build-time values. After changing any of them:
`docker compose build web && docker compose up -d web`.

---

## 7. Frontend

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8080/api/v1` | Where the browser calls the API. Behind Caddy use the same-origin path `/api/v1` — that keeps cookies first-party and removes the need for CORS. |

---

## 8. Minimum viable `.env`

Enough to boot the whole stack and browse real content:

```env
DATABASE_PASSWORD=<openssl rand -base64 24>
JWT_SECRET=<openssl rand -base64 48>
SERVER_INTERNAL_API_KEY=<openssl rand -hex 32>
TMDB_API_KEY=<your v3 key>
VITE_API_URL=/api/v1
APP_ADDRESS=:80
```

Everything else has a working default or degrades gracefully: no OMDb means no
rating badges, no TheTVDB means TMDB-only air dates, no MovieGlu means no
showtimes, no Firebase means no push (the inbox still works).

## 9. Verifying configuration

```bash
curl -s http://localhost/api/internal/health | jq
```

```json
{
  "status": "ok",
  "db": "up",
  "redis": "up",
  "tmdb": "configured",
  "omdb": "not_configured",
  "thetvdb": "not_configured",
  "fcm": "configured"
}
```

`db`/`redis` are live pings; the provider fields report only whether a key is
present, not whether it is valid. A wrong TMDB key shows as `configured` here
and fails at call time with a 401 in the API logs.
