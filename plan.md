## 1. High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│  ┌──────────────┐    ┌──────────────────────────────────┐       │
│  │ React Native │    │ Next.js PWA (TanStack Query)     │       │
│  │ (Expo)       │    │ + Service Worker for offline      │       │
│  └──────┬───────┘    └──────────────┬───────────────────┘       │
└─────────┼───────────────────────────┼───────────────────────────┘
          │                           │
          ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               API Gateway / Reverse Proxy                │   │
│  │                    (Caddy / Traefik)                      │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Go Backend (Chi/Echo)                  │   │
│  │  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ Auth   │ │ Alerts   │ │ Timeline │ │ Notification │  │   │
│  │  │ Module │ │ Module   │ │ Module   │ │ Module       │  │   │
│  │  └────────┘ └──────────┘ └──────────┘ └──────────────┘  │   │
│  │  ┌────────────────┐ ┌──────────────────────────────────┐ │   │
│  │  │ Metadata Sync  │ │ Scheduler (cron-based workers)   │ │   │
│  │  │ (OMDB/TMDB/    │ │                                  │ │   │
│  │  │  TheTVDB)      │ │                                  │ │   │
│  │  └────────────────┘ └──────────────────────────────────┘ │   │
│  └──────────┬──────────────────┬────────────────────────────┘   │
│             ▼                  ▼                                 │
│  ┌──────────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │   PostgreSQL     │  │    Redis      │  │ Firebase Cloud    │  │
│  │   (Primary DB)   │  │  (Cache +     │  │ Messaging / APNs  │  │
│  │                  │  │   Job Queue)  │  │ (Push)            │  │
│  └──────────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Go Backend — Project Structure

```text
showtracker/
├── cmd/
│   └── server/
│       └── main.go                 # Entry point, wires everything
├── internal/
│   ├── config/
│   │   └── config.go               # Env/YAML config loading
│   ├── server/
│   │   └── server.go               # HTTP server setup, middleware
│   ├── auth/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── middleware.go            # JWT validation middleware
│   ├── user/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── model.go
│   ├── show/
│   │   ├── handler.go              # CRUD for shows in local DB
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── model.go
│   ├── alert/
│   │   ├── handler.go
│   │   ├── service.go              # Alert creation, preferences
│   │   ├── repository.go
│   │   └── model.go
│   ├── timeline/
│   │   ├── handler.go
│   │   ├── service.go              # Builds user-specific timelines
│   │   ├── repository.go
│   │   └── model.go
│   ├── notification/
│   │   ├── handler.go
│   │   ├── service.go              # Dispatches push notifications
│   │   ├── fcm.go                  # Firebase Cloud Messaging client
│   │   ├── apns.go                 # Apple Push (if direct)
│   │   └── repository.go
│   ├── metadata/
│   │   ├── syncer.go               # Orchestrates multi-source sync
│   │   ├── omdb/
│   │   │   └── client.go
│   │   ├── tmdb/
│   │   │   └── client.go
│   │   └── thetvdb/
│   │       └── client.go
│   ├── scheduler/
│   │   ├── scheduler.go            # Cron job runner
│   │   ├── jobs/
│   │   │   ├── episode_sync.go
│   │   │   ├── notification_dispatch.go
│   │   │   └── stale_cleanup.go
│   └── pkg/
│       ├── db/
│       │   └── postgres.go         # Connection pool, migrations
│       ├── cache/
│       │   └── redis.go
│       ├── httputil/
│       │   └── response.go         # Standardized JSON responses
│       └── logger/
│           └── logger.go           # Structured logging (slog)
├── migrations/
│   ├── 001_initial_schema.up.sql
│   ├── 001_initial_schema.down.sql
│   └── ...
├── go.mod
├── go.sum
├── Makefile
├── Dockerfile
└── docker-compose.yml
```

---

## 3. PostgreSQL Database Schema

This is the core. Everything revolves around these relationships.

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for fuzzy text search

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT NOT NULL UNIQUE,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    timezone        TEXT NOT NULL DEFAULT 'UTC',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_devices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token    TEXT NOT NULL,           -- FCM / APNs token
    platform        TEXT NOT NULL,           -- 'android', 'ios', 'web'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, device_token)
);

-- ============================================================
-- SHOWS & MOVIES (local cache of external metadata)
-- ============================================================
CREATE TABLE shows (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    media_type      TEXT NOT NULL CHECK (media_type IN ('tv', 'movie')),
    status          TEXT,                    -- 'returning', 'ended', 'canceled', 'in_production'
    overview        TEXT,
    poster_url      TEXT,
    backdrop_url    TEXT,
    genres          TEXT[],
    network         TEXT,
    premiere_date   DATE,
    -- External IDs for cross-referencing
    tmdb_id         INTEGER UNIQUE,
    imdb_id         TEXT UNIQUE,
    thetvdb_id      INTEGER UNIQUE,
    omdb_id         TEXT,                    -- usually same as imdb_id
    -- Sync metadata
    last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_priority   INTEGER NOT NULL DEFAULT 0,  -- higher = synced more often
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shows_title_trgm ON shows USING gin (title gin_trgm_ops);
CREATE INDEX idx_shows_tmdb_id ON shows(tmdb_id);
CREATE INDEX idx_shows_media_type ON shows(media_type);
CREATE INDEX idx_shows_status ON shows(status);

-- ============================================================
-- SEASONS
-- ============================================================
CREATE TABLE seasons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id         UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    season_number   INTEGER NOT NULL,
    name            TEXT,
    overview        TEXT,
    poster_url      TEXT,
    air_date        DATE,
    episode_count   INTEGER,
    tmdb_id         INTEGER,
    thetvdb_id      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(show_id, season_number)
);

-- ============================================================
-- EPISODES
-- ============================================================
CREATE TABLE episodes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id         UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    season_id       UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    season_number   INTEGER NOT NULL,
    episode_number  INTEGER NOT NULL,
    title           TEXT,
    overview        TEXT,
    air_date        DATE,
    runtime_minutes INTEGER,
    still_url       TEXT,
    tmdb_id         INTEGER,
    thetvdb_id      INTEGER,
    imdb_id         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(show_id, season_number, episode_number)
);

CREATE INDEX idx_episodes_air_date ON episodes(air_date);
CREATE INDEX idx_episodes_show_id ON episodes(show_id);

-- ============================================================
-- USER TRACKING (the core relationship)
-- ============================================================
CREATE TABLE user_tracked_shows (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    show_id         UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    is_favorite     BOOLEAN NOT NULL DEFAULT FALSE,
    -- Notification preferences per show
    notify_new_episode  BOOLEAN NOT NULL DEFAULT TRUE,
    notify_new_season   BOOLEAN NOT NULL DEFAULT TRUE,
    notify_status_change BOOLEAN NOT NULL DEFAULT TRUE,
    -- How far ahead to notify (in hours)
    notify_hours_before INTEGER NOT NULL DEFAULT 0,
    -- Tracking state
    last_watched_season  INTEGER,
    last_watched_episode INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, show_id)
);

CREATE INDEX idx_tracked_user ON user_tracked_shows(user_id);
CREATE INDEX idx_tracked_show ON user_tracked_shows(show_id);
CREATE INDEX idx_tracked_favorite ON user_tracked_shows(is_favorite)
    WHERE is_favorite = TRUE;

-- ============================================================
-- TIMELINE EVENTS (denormalized for fast reads)
-- ============================================================
CREATE TABLE timeline_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id         UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL CHECK (event_type IN (
                        'new_episode', 'season_premiere', 'season_finale',
                        'series_premiere', 'series_finale',
                        'movie_release', 'status_change'
                    )),
    title           TEXT NOT NULL,
    description     TEXT,
    event_date      TIMESTAMPTZ NOT NULL,
    -- Denormalized for query performance
    season_number   INTEGER,
    episode_number  INTEGER,
    episode_id      UUID REFERENCES episodes(id) ON DELETE SET NULL,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timeline_event_date ON timeline_events(event_date);
CREATE INDEX idx_timeline_show_id ON timeline_events(show_id);
CREATE INDEX idx_timeline_type ON timeline_events(event_type);

-- ============================================================
-- NOTIFICATIONS LOG
-- ============================================================
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timeline_event_id UUID REFERENCES timeline_events(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    payload         JSONB DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sent', 'failed', 'read')),
    scheduled_for   TIMESTAMPTZ NOT NULL,
    sent_at         TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status)
    WHERE status = 'pending';
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for)
    WHERE status = 'pending';

-- ============================================================
-- METADATA SYNC LOG (auditing & deduplication)
-- ============================================================
CREATE TABLE sync_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source          TEXT NOT NULL,           -- 'tmdb', 'omdb', 'thetvdb'
    show_id         UUID REFERENCES shows(id) ON DELETE CASCADE,
    status          TEXT NOT NULL,           -- 'success', 'failed', 'partial'
    records_updated INTEGER DEFAULT 0,
    error_message   TEXT,
    started_at      TIMESTAMPTZ NOT NULL,
    finished_at     TIMESTAMPTZ
);
```

---

## 4. Go Backend — API Design

### 4.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Returns JWT access + refresh token |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Invalidate refresh token |

Use **JWT** with short-lived access tokens (15 min) and longer refresh tokens (7 days) stored in an `httpOnly` cookie for the PWA. For the mobile app, the refresh token lives in secure storage.

### 4.2 User & Devices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/me` | Current user profile |
| PATCH | `/api/v1/me` | Update profile (timezone, etc.) |
| POST | `/api/v1/me/devices` | Register a push token |
| DELETE | `/api/v1/me/devices/:id` | Unregister a device |

### 4.3 Shows & Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/shows/search?q=...&type=tv\|movie` | Search (hits local DB first, falls through to TMDB) |
| GET | `/api/v1/shows/:id` | Full show detail with seasons |
| GET | `/api/v1/shows/:id/seasons/:num` | Season detail with episodes |
| GET | `/api/v1/shows/:id/episodes?upcoming=true` | Episode listing with filters |
| GET | `/api/v1/shows/trending` | Cached trending from TMDB |
| GET | `/api/v1/shows/popular` | Cached popular from TMDB |

**Search strategy:**
1. Query local Postgres using `pg_trgm` similarity on `shows.title`.
2. If fewer than 5 results, fan out to TMDB search API.
3. Upsert any new results into local DB, return merged set.
4. Cache search results in Redis for 1 hour.

### 4.4 Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tracking` | All tracked shows for current user |
| POST | `/api/v1/tracking` | Track a show `{ show_id, notify_* prefs }` |
| PATCH | `/api/v1/tracking/:show_id` | Update preferences / watched progress |
| DELETE | `/api/v1/tracking/:show_id` | Untrack |
| GET | `/api/v1/tracking/favorites` | Favorites only |
| POST | `/api/v1/tracking/:show_id/favorite` | Toggle favorite |

When a user tracks a show, the backend:
1. Inserts into `user_tracked_shows`.
2. Bumps `shows.sync_priority` so the scheduler syncs it more frequently.
3. Generates any pending `notifications` for already-known upcoming episodes.

### 4.5 Timeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/timeline?from=...&to=...&type=...` | User's personalized timeline |
| GET | `/api/v1/timeline/today` | Shortcut: today's events |
| GET | `/api/v1/timeline/week` | Shortcut: this week |
| GET | `/api/v1/timeline/upcoming` | Next 30 days |

**Timeline query logic:**
```sql
SELECT te.*
FROM timeline_events te
INNER JOIN user_tracked_shows uts ON uts.show_id = te.show_id
WHERE uts.user_id = $1
  AND te.event_date BETWEEN $2 AND $3
ORDER BY te.event_date ASC;
```

This is why `timeline_events` is denormalized — one indexed join, no subqueries.

### 4.6 Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications?status=...&page=...` | Notification history |
| PATCH | `/api/v1/notifications/:id/read` | Mark as read |
| POST | `/api/v1/notifications/read-all` | Mark all read |
| GET | `/api/v1/notifications/unread-count` | Badge count |

### 4.7 Internal / Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/internal/sync/trigger` | Manually trigger a metadata sync |
| GET | `/api/internal/sync/status` | Last sync log entries |
| GET | `/api/internal/health` | Health check (DB, Redis, external APIs) |

---

## 5. Metadata Sync Engine (The Hard Part)

This is the most critical background component. It runs as goroutines managed by a scheduler.

### 5.1 Multi-Source Strategy

```text
              ┌─────────────────────────────────┐
              │       Metadata Syncer            │
              │                                  │
              │  1. TMDB  (primary source)       │
              │     - Show/movie metadata        │
              │     - Seasons & episodes         │
              │     - Images, genres             │
              │     - "Changes" API for diffs    │
              │                                  │
              │  2. TheTVDB (secondary/fallback) │
              │     - Episode air dates          │
              │     - Season data                │
              │     - Used when TMDB lacks data  │
              │                                  │
              │  3. OMDB (supplementary)         │
              │     - Ratings (IMDb, RT, Meta)   │
              │     - Concise plot summaries     │
              │     - Awards info                │
              └─────────────────────────────────┘
```

### 5.2 Sync Jobs

**Job 1: Full Sync for Tracked Shows** (runs every 6 hours)
```text
1. SELECT DISTINCT show_id FROM user_tracked_shows
   JOIN shows ON ... WHERE shows.status IN ('returning', 'in_production')
   ORDER BY sync_priority DESC, last_synced_at ASC
   LIMIT 100;                                    -- rate-limit friendly batch

2. For each show:
   a. GET /tv/{tmdb_id}?append_to_response=seasons  from TMDB
   b. Diff against local DB:
      - New seasons?  → INSERT into seasons, create timeline_event (season_premiere)
      - New episodes? → INSERT into episodes, create timeline_event (new_episode)
      - Status changed? → UPDATE shows, create timeline_event (status_change)
   c. If TMDB lacks air_date for episodes → fallback to TheTVDB
   d. Enrich with OMDB ratings (batch, lower priority)
   e. UPDATE shows SET last_synced_at = NOW()
   f. INSERT sync_log entry

3. For each NEW timeline_event created:
   a. Find all users tracking this show with matching notification prefs
   b. INSERT into notifications (status = 'pending', scheduled_for = air_date - notify_hours_before)
```

**Job 2: TMDB Changes API Poll** (runs every 1 hour)
```text
1. GET /tv/changes?start_date={1h_ago}&end_date={now} from TMDB
2. Cross-reference returned IDs with local shows table (tmdb_id)
3. For any matches, queue an immediate sync for that show
```

**Job 3: Notification Dispatcher** (runs every 1 minute)
```text
1. SELECT * FROM notifications
   WHERE status = 'pending' AND scheduled_for <= NOW()
   ORDER BY scheduled_for ASC
   LIMIT 500;

2. For each notification:
   a. Look up user_devices for the user
   b. Send via FCM (Android + Web) and/or APNs (iOS)
   c. UPDATE notifications SET status = 'sent', sent_at = NOW()
   d. On failure: retry up to 3x, then mark 'failed'
```

**Job 4: Stale Data Cleanup** (runs daily at 3 AM)
```text
1. Shows with no tracked users and last_synced_at > 30 days:
   → Set sync_priority = 0 (don't actively sync, but keep data)

2. Notifications older than 90 days and status = 'read':
   → DELETE (or archive to cold storage)

3. Sync logs older than 30 days:
   → DELETE
```

### 5.3 Rate Limiting & Resilience

- **TMDB**: 40 requests/10 seconds. Use a token bucket rate limiter in the Go client.
- **TheTVDB**: Requires auth token (JWT from their API), cache it, rotate before expiry.
- **OMDB**: 1000 requests/day (free tier). If you need more, prioritize by sync_priority.
- All external HTTP calls wrapped with:
  - Context timeout (10s per request)
  - Exponential backoff retry (3 attempts)
  - Circuit breaker (using `sony/gobreaker` or similar)

---

## 6. Next.js PWA Frontend

### 6.1 Project Structure

```text
web/
├── public/
│   ├── manifest.json
│   ├── sw.js                       # Service worker (or next-pwa generated)
│   └── icons/
├── src/
│   ├── app/                        # App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Landing / dashboard
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── shows/
│   │   │   ├── [id]/page.tsx       # Show detail
│   │   │   └── search/page.tsx
│   │   ├── timeline/
│   │   │   └── page.tsx
│   │   ├── tracking/
│   │   │   └── page.tsx
│   │   └── notifications/
│   │       └── page.tsx
│   ├── components/
│   │   ├── ui/                     # Primitives (shadcn/ui or custom)
│   │   ├── show-card.tsx
│   │   ├── timeline-event.tsx
│   │   ├── notification-item.tsx
│   │   ├── search-bar.tsx
│   │   └── tracking-toggle.tsx
│   ├── lib/
│   │   ├── api.ts                  # Axios/fetch wrapper pointed at Go backend
│   │   ├── auth.ts                 # Token management
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── use-shows.ts
│   │   ├── use-timeline.ts
│   │   ├── use-tracking.ts
│   │   └── use-notifications.ts
│   └── providers/
│       ├── query-provider.tsx      # TanStack Query provider
│       └── auth-provider.tsx
├── next.config.js
├── tailwind.config.ts
└── package.json
```

### 6.2 TanStack Query Caching Strategy

This is where the local caching story lives. TanStack Query gives you a powerful cache layer in the browser.

```typescript
// providers/query-provider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  persistQueryClient,
  createSyncStoragePersister,
} from "@tanstack/react-query-persist-client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data considered fresh for 5 minutes — no refetch
      staleTime: 5 * 60 * 1000,
      // Keep unused cache for 30 minutes
      gcTime: 30 * 60 * 1000, // (formerly cacheTime)
      // Retry failed requests 2 times
      retry: 2,
      // Refetch when window regains focus
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect if data is fresh
      refetchOnReconnect: "always",
    },
  },
});

// Persist cache to localStorage for offline PWA support
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  // Throttle writes to localStorage
  throttleTime: 1000,
});

persistQueryClient({
  queryClient,
  persister,
  // Cache persists for 24 hours across browser restarts
  maxAge: 24 * 60 * 60 * 1000,
  // Only persist these query keys
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const persistKeys = [
        "timeline",
        "tracking",
        "show-detail",
        "notifications-count",
      ];
      return persistKeys.some((key) =>
        (query.queryKey[0] as string)?.startsWith(key)
      );
    },
  },
});
```

### 6.3 Query Hooks (examples)

```typescript
// hooks/use-timeline.ts
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useTimeline(range: "today" | "week" | "upcoming") {
  return useQuery({
    queryKey: ["timeline", range],
    queryFn: () => api.get(`/timeline/${range}`).then((r) => r.data),
    staleTime: 2 * 60 * 1000, // 2 min — timeline changes often
  });
}

export function useTimelineRange(from: string, to: string) {
  return useQuery({
    queryKey: ["timeline", "range", from, to],
    queryFn: () =>
      api.get(`/timeline`, { params: { from, to } }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}
```

```typescript
// hooks/use-tracking.ts
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useTrackedShows() {
  return useQuery({
    queryKey: ["tracking"],
    queryFn: () => api.get("/tracking").then((r) => r.data),
    staleTime: 10 * 60 * 1000, // 10 min — doesn't change often
  });
}

export function useTrackShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { show_id: string; notify_new_episode: boolean }) =>
      api.post("/tracking", payload),
    onSuccess: () => {
      // Invalidate tracking list and timeline (new show = new events)
      qc.invalidateQueries({ queryKey: ["tracking"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

export function useUntrackShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (showId: string) => api.delete(`/tracking/${showId}`),
    // Optimistic update: remove from cache immediately
    onMutate: async (showId) => {
      await qc.cancelQueries({ queryKey: ["tracking"] });
      const previous = qc.getQueryData(["tracking"]);
      qc.setQueryData(["tracking"], (old: any[]) =>
        old?.filter((s) => s.show_id !== showId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      qc.setQueryData(["tracking"], context?.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tracking"] });
    },
  });
}
```

```typescript
// hooks/use-shows.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useShowSearch(query: string) {
  return useQuery({
    queryKey: ["show-search", query],
    queryFn: () =>
      api.get("/shows/search", { params: { q: query } }).then((r) => r.data),
    enabled: query.length >= 2, // Don't fire on empty input
    staleTime: 60 * 60 * 1000, // 1 hour — search results are stable
    // Show previous results while new ones load (search-as-you-type)
    placeholderData: (prev) => prev,
  });
}

export function useShowDetail(id: string) {
  return useQuery({
    queryKey: ["show-detail", id],
    queryFn: () => api.get(`/shows/${id}`).then((r) => r.data),
    staleTime: 15 * 60 * 1000, // 15 min
  });
}
```

### 6.4 PWA Setup

**manifest.json:**
```json
{
  "name": "ShowTracker",
  "short_name": "ShowTracker",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Service Worker strategy** (using `next-pwa` or Workbox):
- **Network First** for API calls (`/api/*`) — always try fresh, fall back to cache.
- **Cache First** for static assets (images, JS bundles).
- **Stale While Revalidate** for show poster images from TMDB CDN.
- The TanStack Query localStorage persister handles application-level data caching. The service worker handles network-level caching. They complement each other.

### 6.5 Push Notifications on Web

```typescript
// lib/push.ts
export async function subscribeToPush() {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  // Send subscription to Go backend
  await api.post("/me/devices", {
    device_token: JSON.stringify(subscription),
    platform: "web",
  });
}
```

---

## 7. Caching Architecture (Redis)

Redis sits between the Go backend and Postgres for hot data.

| Key Pattern | TTL | Purpose |
|---|---|---|
| `show:{tmdb_id}` | 15 min | Full show metadata |
| `search:{hash(query)}` | 1 hour | Search results |
| `timeline:{user_id}:{date}` | 5 min | Daily timeline |
| `trending` | 1 hour | TMDB trending shows |
| `popular` | 1 hour | TMDB popular shows |
| `unread:{user_id}` | until invalidated | Notification badge count |
| `ratelimit:tmdb` | rolling window | Token bucket state |

**Cache invalidation strategy:**
- On metadata sync: delete `show:{tmdb_id}` and `timeline:*` keys for affected users.
- On tracking change: delete `timeline:{user_id}:*`.
- On notification sent: decrement/invalidate `unread:{user_id}`.

---

## 8. Notification Flow (End to End)

```text
1. Scheduler Job: episode_sync discovers new episode (air_date = Feb 20)
                          │
2. INSERT timeline_event  │  INSERT notification (pending, scheduled_for = Feb 20 00:00 - user.notify_hours_before)
                          │
3. Notification Dispatcher job picks it up at scheduled_for time
                          │
4. Look up user_devices   │
   ┌──────────────────────┼────────────────────┐
   │                      │                    │
   ▼                      ▼                    ▼
   FCM (Android)     FCM (Web/PWA)        APNs (iOS)
   │                      │                    │
   ▼                      ▼                    ▼
   Android app        Service worker        iOS app
   notification       shows notification    notification
```

---

## 9. Deployment & Infrastructure

```yaml
# docker-compose.yml (development)
services:
  api:
    build: .
    ports: ["8080:8080"]
    env_file: .env
    depends_on: [postgres, redis]

  postgres:
    image: postgres:16-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]
    environment:
      POSTGRES_DB: showtracker
      POSTGRES_USER: showtracker
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  web:
    build: ./web
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8080/api/v1

volumes:
  pgdata:
```

For production, I'd suggest:
- **Go backend + Next.js** on a single VPS (Hetzner, fly.io, or a cheap dedicated box if you're self-hosting) behind Caddy for automatic HTTPS.
- **Postgres**: Managed (Neon, Supabase) or self-hosted with pg_basebackup for backups.
- **Redis**: Self-hosted on same box is fine at small scale.
- **Migrations**: Use `golang-migrate/migrate` CLI, run in CI before deploy.

---

## 10. Implementation Order (Suggested Phases)

**Phase 1 — Foundation (Week 1-2)**
- Go project scaffold, config, DB connection, migrations
- User auth (register, login, JWT)
- Shows table + TMDB client (search + detail fetch)
- Basic Next.js app with auth pages and search

**Phase 2 — Core Tracking (Week 3-4)**
- Tracking CRUD endpoints
- Seasons/episodes sync from TMDB
- Timeline event generation
- Timeline API + frontend page
- TanStack Query integration with persistence

**Phase 3 — Notifications (Week 5-6)**
- Scheduler framework (cron jobs in Go)
- Episode sync job
- Notification generation from timeline events
- FCM integration (web push first)
- Device registration flow
- PWA manifest + service worker

**Phase 4 — Polish & Secondary Sources (Week 7-8)**
- TheTVDB fallback integration
- OMDB ratings enrichment
- Redis caching layer
- Optimistic UI updates
- Offline PWA experience (stale cache display)
- Notification history page

**Phase 5 — Future Scope (Later)**
- Watchlist feature
- Watch history tracking
- Recommendation engine (collaborative filtering on tracked shows)
- React Native mobile app
- MovieGlu cinema/showtime integration

---

## 11. Key Technical Decisions & Rationale

| Decision | Rationale |
|---|---|
| **TMDB as primary source** | Best free API, most complete data, has a Changes endpoint for efficient polling |
| **Denormalized timeline_events** | Avoids expensive JOINs for the most frequently accessed query (user timeline) |
| **TanStack Query + localStorage persist** | Gives you offline-capable PWA without a full IndexedDB setup; staleTime/gcTime provide fine-grained control |
| **PostgreSQL pg_trgm** | Fuzzy text search without needing Elasticsearch at this scale |
| **Redis for hot cache, not as primary store** | Postgres is the source of truth; Redis is expendable and can be rebuilt from DB |
| **Separate notifications table** | Decouples "what happened" (timeline_events) from "who was told" (notifications), enabling per-user scheduling and retry |
| **UUID primary keys** | Safe for distributed systems, no sequence conflicts, opaque to clients |

---
