package jobs

import (
	"context"
	"log/slog"
	"time"

	"github.com/tashifkhan/bingebeacon/internal/metadata"
	"github.com/tashifkhan/bingebeacon/internal/scheduler"
)

func NewChangesSyncJob(syncer *metadata.Syncer, logger *slog.Logger) scheduler.Job {
	return scheduler.Job{
		Name:     "tmdb_changes_sync",
		Interval: time.Hour,
		Run: func(ctx context.Context) error {
			now := time.Now().UTC()
			logger.Info("Polling TMDB changes", "from", now.Add(-time.Hour), "to", now)
			return syncer.SyncChanged(ctx, now.Add(-time.Hour), now)
		},
	}
}
