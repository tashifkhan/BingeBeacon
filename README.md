# BingeBeacon

BingeBeacon is a TV and movie release tracker with a Go API, PostgreSQL catalog,
Redis caching, scheduled metadata synchronization, Firebase push delivery, and a
TanStack Start installable PWA.

## What is implemented

- Email/password authentication with rotating JWT refresh tokens; PWA refresh
  tokens are held in an HttpOnly cookie while mobile clients receive them in JSON
- TMDB search, trending, popular, and catalog import for both TV and movies
- OMDb rating enrichment and TheTVDB episode air-date backfill
- Per-show tracking, favorites, alert lead times, and notification preferences
- User-local today/week/upcoming timelines for episodes, seasons, and movies
- Durable notification inbox plus optional Firebase Cloud Messaging delivery,
  three-attempt retry, and invalid-device deactivation
- Watchlist, watch history, episode progress, streaming providers, and showtimes
- PostgreSQL migrations, Redis caching, prioritized six-hour sync, hourly TMDB
  change polling, sync audit logs, and scheduled cleanup jobs
- Responsive TanStack Start PWA with typed TanStack Router routes, a runtime
  caching service worker, and persisted TanStack Query caches for timelines,
  tracking, notifications, watchlists, and history

## Run locally

Prerequisites: Go 1.24+, Bun, Docker, and Docker Compose v2.

```bash
make setup        # .env from .env.example, secrets/, web/.env.local symlink
```

Add at least a TMDB v3 key, a `DATABASE_PASSWORD`, and a 32+ character
`JWT_SECRET` to `.env`, then:

```bash
make docker-dev   # postgres + redis, bound to 127.0.0.1
make dev          # API on :8080 — applies migrations on startup
make web-dev      # PWA on :3000 with HMR
```

## Everything in Docker

```bash
make docker-prod  # docker compose up -d --build
make health       # {"status":"ok","db":"up","redis":"up",...}
```

Caddy is the only service that publishes ports; it serves the PWA on `/` and
proxies `/api/*` to the Go API on the internal network, so Postgres and Redis
are never exposed. Health checks gate startup ordering. Public `VITE_*`
variables are baked in as image build arguments — rebuild `web` after changing
one — while backend secrets stay runtime variables.

Images: API ~54 MB (static binary on Alpine, non-root), web ~106 MB (Nitro
`.output` on Bun Alpine, non-root).

## Configuration

Every variable, its default, and step-by-step instructions for obtaining each
API credential (TMDB, OMDb, TheTVDB, MovieGlu, Firebase) are documented in
[docs/environment.md](docs/environment.md).

Only TMDB is genuinely required. Without OMDb there are no rating badges,
without TheTVDB air dates come from TMDB alone, without MovieGlu there are no
showtimes, and without Firebase the notification inbox works but push does not.

## Main API groups

| Path | Purpose |
| --- | --- |
| `/api/v1/auth/*` | Register, login, refresh, logout |
| `/api/v1/shows/*` | Search, trending, popular, import, details, seasons, episodes |
| `/api/v1/tracking/*` | Tracking preferences and favorites |
| `/api/v1/timeline/*` | Today, week, upcoming, and custom ranges |
| `/api/v1/notifications/*` | Inbox, unread count, read state |
| `/api/v1/watchlist/*` | Watch-later queue and tracking handoff |
| `/api/v1/history/*` | Watched episodes, stats, and progress |
| `/api/v1/streaming/*` | TMDB watch providers by region |
| `/api/v1/showtimes/*` | MovieGlu cinemas and sessions |
| `/api/internal/health` | Dependency health/configuration status |
| `/api/internal/sync/*` | Key-protected manual sync and audit status |

See [deployment.md](deployment.md) for provider credentials and detailed setup.
