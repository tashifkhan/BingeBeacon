CREATE TABLE IF NOT EXISTS user_tracked_shows (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    show_id         UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    is_favorite     BOOLEAN NOT NULL DEFAULT FALSE,
    notify_new_episode  BOOLEAN NOT NULL DEFAULT TRUE,
    notify_new_season   BOOLEAN NOT NULL DEFAULT TRUE,
    notify_status_change BOOLEAN NOT NULL DEFAULT TRUE,
    notify_hours_before INTEGER NOT NULL DEFAULT 0,
    last_watched_season  INTEGER,
    last_watched_episode INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, show_id)
);

CREATE INDEX IF NOT EXISTS idx_tracked_user ON user_tracked_shows(user_id);
CREATE INDEX IF NOT EXISTS idx_tracked_show ON user_tracked_shows(show_id);
CREATE INDEX IF NOT EXISTS idx_tracked_favorite ON user_tracked_shows(is_favorite) WHERE is_favorite = TRUE;

CREATE TABLE IF NOT EXISTS timeline_events (
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
    season_number   INTEGER,
    episode_number  INTEGER,
    episode_id      UUID REFERENCES episodes(id) ON DELETE SET NULL,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_event_date ON timeline_events(event_date);
CREATE INDEX IF NOT EXISTS idx_timeline_show_id ON timeline_events(show_id);
CREATE INDEX IF NOT EXISTS idx_timeline_type ON timeline_events(event_type);

CREATE TABLE IF NOT EXISTS notifications (
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

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS sync_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source          TEXT NOT NULL,
    show_id         UUID REFERENCES shows(id) ON DELETE CASCADE,
    status          TEXT NOT NULL,
    records_updated INTEGER DEFAULT 0,
    error_message   TEXT,
    started_at      TIMESTAMPTZ NOT NULL,
    finished_at     TIMESTAMPTZ
);
