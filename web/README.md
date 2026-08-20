# BingeBeacon Web

The frontend is a TanStack Start PWA running on React 19, TanStack Router,
TanStack Query, Vite, Tailwind CSS v4, and Bun.

## Development

```bash
cp .env.example .env.local
bun install
bun run dev
```

The app runs at `http://localhost:3000`. Client-visible configuration must use
the `VITE_` prefix; `VITE_API_URL` defaults to
`http://localhost:8080/api/v1`.

## Quality checks

```bash
bun run typecheck
bun run lint
bun run build
```

TanStack Start generates `src/routeTree.gen.ts` from `src/routes`. The Nitro
Bun preset emits the production application to `.output`; run it with:

```bash
bun run start
```

## Offline support

`public/sw.js` uses network-first caching for pages and API reads,
stale-while-revalidate for TMDB images, cache-first for static assets, and
`/~offline` as the navigation fallback. TanStack Query separately persists the
user's timeline, tracking, notification, watchlist, and history caches in local
storage.
