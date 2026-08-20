ALTER TABLE notifications
    DROP COLUMN IF EXISTS last_error,
    DROP COLUMN IF EXISTS retry_count;

