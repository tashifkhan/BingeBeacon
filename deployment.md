# BingeBeacon Deployment Guide

Setup and deployment for BingeBeacon — a PWA TV/movie tracking and alert system.

For the exhaustive list of environment variables and how to obtain every
credential, see **[docs/environment.md](docs/environment.md)**. This document
covers topology, images, and operations.

## Stack

| Component | Technology |
| --- | --- |
| API | Go 1.24, applies its own migrations on startup |
| Database | PostgreSQL 16 (JSONB) |
| Cache / rate limiting | Redis 7 |
| Frontend | TanStack Start (Router + Vite + Nitro), React 19, Tailwind v4 |
| PWA | Runtime-caching service worker + persisted TanStack Query cache |
| Reverse proxy | Caddy 2 (automatic HTTPS) |
| Package manager | Bun |

---

## 1. Topology

```
                       :80 / :443
                            │
                       ┌────▼────┐
                       │  caddy  │   automatic HTTPS, single public surface
                       └──┬───┬──┘
              /api/*      │   │      /*
                 ┌────────┘   └────────┐
            ┌────▼────┐           ┌────▼────┐
            │   api   │           │   web   │  TanStack Start on Bun, :3000
            │  :8080  │           └─────────┘
            └──┬───┬──┘
      ┌────────┘   └────────┐
 ┌────▼─────┐         ┌─────▼─────┐
 │ postgres │         │   redis   │
 └──────────┘         └───────────┘
```

Only Caddy publishes ports. `api`, `web`, `postgres`, and `redis` communicate
over the compose network and are unreachable from outside the host — there is
no exposed database. To reach the API directly while debugging, uncomment the
`127.0.0.1:8080:8080` mapping in `docker-compose.yml`.

---

## 2. Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Compose v2 (`docker compose`,
  not the legacy `docker-compose`)
- [Go 1.24+](https://go.dev/dl/) — local backend development only
- [Bun](https://bun.sh/) — local frontend development only
- [golang-migrate](https://github.com/golang-migrate/migrate) — optional; only
  for creating or manually rolling back migrations

---

## 3. Configuration

```bash
make setup          # copies .env.example -> .env, creates secrets/, links web/.env.local
```

Then edit `.env`. The absolute minimum to boot with real content:

```env
DATABASE_PASSWORD=<openssl rand -base64 24>
JWT_SECRET=<openssl rand -base64 48>
SERVER_INTERNAL_API_KEY=<openssl rand -hex 32>
TMDB_API_KEY=<TMDB v3 key>
VITE_API_URL=/api/v1
```

Two rules worth internalising:

1. **`VITE_*` is build-time and public.** Vite inlines those values into the
   JavaScript bundle. Changing one requires `docker compose build web`, not a
   restart, and none of them may hold a secret.
2. **Everything else is runtime.** Backend config is read on process start, so a
   `docker compose up -d api` picks up `.env` changes.

`docker-compose.yml` deliberately overrides four values regardless of `.env`,
because they describe the container network rather than your deployment:
`SERVER_ENVIRONMENT=production`, `DATABASE_HOST=postgres`,
`REDIS_ADDR=redis:6379`, and `FCM_CREDENTIALS_FILE=/app/secrets/firebase-credentials.json`.

### Firebase credentials

Drop the service account JSON at `secrets/firebase-credentials.json`. Compose
mounts the whole `./secrets` directory read-only at `/app/secrets`, so the stack
still starts cleanly when the file is absent — the API logs
`FCM initialization failed` and serves the in-app notification inbox without
push. `secrets/` is gitignored.

---

## 4. Development

### Option A — native services, containerised dependencies (recommended)

```bash
make docker-dev     # postgres + redis on 127.0.0.1 only
make dev            # go run ./cmd/server  (applies migrations, then serves :8080)
make web-dev        # cd web && bun dev    (:3000, HMR)
```

`VITE_API_URL=http://localhost:8080/api/v1` and
`SERVER_CORS_ORIGINS=http://localhost:3000` for this mode.

### Option B — full stack in Docker

```bash
make docker-prod
```

Service workers require HTTPS outside `localhost`, so test PWA installability
either on `localhost` or against a real hostname with Caddy's TLS.

---

## 5. Production

```bash
make docker-prod                    # docker compose up -d --build
make health                         # {"status":"ok","db":"up","redis":"up",...}
make docker-logs
```

Startup ordering is enforced by health checks: Postgres and Redis must report
healthy before `api` starts, and both `api` and `web` must report healthy before
Caddy starts. Both application images ship their own `HEALTHCHECK`, so
`docker compose ps` reflects real readiness rather than "process exists".

### Public hostname and HTTPS

Point an A/AAAA record at the host, open 80 and 443, then:

```env
APP_ADDRESS=shows.example.com
VITE_API_URL=/api/v1
SERVER_CORS_ORIGINS=https://shows.example.com
SERVER_INTERNAL_API_KEY=<long-random-secret>
```

```bash
docker compose up -d --build
```

Caddy provisions and renews a Let's Encrypt certificate automatically; the
certificates live in the `caddy_data` named volume, so don't prune it.

Keeping `VITE_API_URL=/api/v1` makes API calls same-origin: no CORS
preflights, and the refresh-token cookie stays first-party. The PWA stores
refresh tokens only in a Secure, HttpOnly cookie; mobile clients still receive
them in the JSON response for platform secure storage.

### Images

| Image | Base | Size | Notes |
| --- | --- | --- | --- |
| `bingebeacon-api` | `alpine:3.21` | ~54 MB | Static `CGO_ENABLED=0` binary, `-trimpath -s -w`, runs as uid 10001, migrations bundled |
| `bingebeacon-web` | `oven/bun:1.3-alpine` | ~106 MB | Only `.output` is copied into the runtime stage; no `node_modules`, runs as `bun` |

Both use BuildKit cache mounts (`/go/pkg/mod`, Go build cache, Bun install
cache), so incremental rebuilds are dominated by compilation, not downloads.

### Building images individually

```bash
docker build -t bingebeacon-api:latest .
docker run --rm -p 8080:8080 --env-file .env \
  -v "$PWD/secrets:/app/secrets:ro" bingebeacon-api:latest

docker build -t bingebeacon-web:latest \
  --build-arg VITE_API_URL=/api/v1 \
  --build-arg VITE_FIREBASE_API_KEY=... \
  ./web
docker run --rm -p 3000:3000 bingebeacon-web:latest
```

Note the `--build-arg` flags: `--env-file` at *run* time does nothing for the
frontend, since Vite has already inlined those values.

### Without Docker

```bash
CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o bin/bingebeacon ./cmd/server
./bin/bingebeacon

cd web && bun install && bun run build && bun run start
```

---

## 6. Migrations

`cmd/server/main.go` runs everything in `migrations/` on startup and exits
non-zero on failure, so a deploy needs no separate migration step. For manual
control:

```bash
make migrate-up
make migrate-down          # rolls back exactly one step
make migrate-create name=add_something
```

Or through Docker, without installing the CLI:

```bash
docker compose -f docker-compose.dev.yml --profile tools run --rm migrate up
docker compose -f docker-compose.dev.yml --profile tools run --rm migrate down 1
```

If a migration fails halfway, `schema_migrations.dirty` is set and the API will
refuse to start. Fix the SQL, then force the version:

```bash
migrate -path migrations -database "$DB_URL" force <last-good-version>
```

---

## 7. Backups

The Postgres data directory is bind-mounted at `./data/postgres`.

```bash
docker compose exec -T postgres pg_dump -U postgres bingebeacon | gzip > backup-$(date +%F).sql.gz
gunzip -c backup-2026-08-13.sql.gz | docker compose exec -T postgres psql -U postgres bingebeacon
```

`make docker-nuke` tears down the stack *and* deletes `data/` — it is not the
command you want in production.

---

## 8. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `401 Invalid API key` from TMDB | You used the v4 Read Access Token (starts with `eyJ`). BingeBeacon needs the 32-char v3 key. |
| Health shows `"tmdb":"configured"` but calls fail | The health endpoint only checks that a key is *present*, never that it is valid. Check the API logs. |
| `DATABASE_PASSWORD must be set` on `up` | Prod compose requires a non-empty password. Set it in `.env`. |
| Frontend calls `localhost:8080` in production | `VITE_API_URL` was baked in at build time. Set it to `/api/v1` and `docker compose build web`. |
| CORS errors | Either add the origin to `SERVER_CORS_ORIGINS`, or better, serve same-origin with `VITE_API_URL=/api/v1`. |
| `FCM initialization failed` in logs | Expected when `secrets/firebase-credentials.json` is missing. Push is disabled; everything else works. |
| Service worker not registering | PWAs require HTTPS or `localhost`. Clear existing registrations in DevTools → Application. |
| Background push never arrives | Verify `/sw.js` is registered and `VITE_FIREBASE_VAPID_KEY` is the **public** Web Push key. |
| Caddy cannot get a certificate | `APP_ADDRESS` must be a real hostname resolving to this host, with 80/443 reachable from the internet. |
| Stale frontend after a rebuild | The service worker serves the old shell. Hard-reload or unregister it. |
