CREATE TABLE IF NOT EXISTS shows (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    media_type      TEXT NOT NULL CHECK (media_type IN ('tv', 'movie')),
    status          TEXT,
    overview        TEXT,
    poster_url      TEXT,
    backdrop_url    TEXT,
    genres          TEXT[],
    network         TEXT,
    premiere_date   DATE,
    tmdb_id         INTEGER UNIQUE,
    imdb_id         TEXT UNIQUE,
    thetvdb_id      INTEGER UNIQUE,
    omdb_id         TEXT,
    last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_priority   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shows_title_trgm ON shows USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_shows_tmdb_id ON shows(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_shows_media_type ON shows(media_type);
CREATE INDEX IF NOT EXISTS idx_shows_status ON shows(status);

CREATE TABLE IF NOT EXISTS seasons (
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

CREATE TABLE IF NOT EXISTS episodes (
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

CREATE INDEX IF NOT EXISTS idx_episodes_air_date ON episodes(air_date);
CREATE INDEX IF NOT EXISTS idx_episodes_show_id ON episodes(show_id);
