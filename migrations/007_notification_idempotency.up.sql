CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_event_unique
    ON notifications(user_id, timeline_event_id)
    WHERE timeline_event_id IS NOT NULL;

