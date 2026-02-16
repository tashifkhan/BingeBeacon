-- Watchlist
CREATE TYPE watchlist_priority AS ENUM ('high', 'medium', 'low');

CREATE TABLE watchlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    priority watchlist_priority NOT NULL DEFAULT 'medium',
    notes TEXT,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, show_id)
);

CREATE INDEX idx_watchlist_user_priority ON watchlist_items(user_id, priority);

-- Watch History
CREATE TABLE watch_history_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL,
    episode_number INTEGER NOT NULL,
    episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL, -- optional link if episode exists in DB
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    notes TEXT,
    watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, show_id, season_number, episode_number)
);

CREATE INDEX idx_history_user_show ON watch_history_entries(user_id, show_id);
CREATE INDEX idx_history_watched_at ON watch_history_entries(watched_at DESC);
