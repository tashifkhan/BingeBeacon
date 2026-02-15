package jobs

import (
	"context"
	"log/slog"
	"time"

	"github.com/tashifkhan/bingebeacon/internal/alert"
	"github.com/tashifkhan/bingebeacon/internal/metadata"
	"github.com/tashifkhan/bingebeacon/internal/scheduler"
)

func NewEpisodeSyncJob(
	syncer *metadata.Syncer,
	alertRepo *alert.Repository,
	logger *slog.Logger,
) scheduler.Job {
	return scheduler.Job{
		Name:     "episode_sync",
		Interval: 6 * time.Hour,
		Run: func(ctx context.Context) error {
			// 1. Get tracked show IDs
			// Ideally we prioritize "returning" shows.
			// For Phase 1/2, just sync all tracked shows.
			ids, err := alertRepo.GetDistinctTrackedShowIDs()
			if err != nil {
				return err
			}

			logger.Info("Starting full sync", "shows_count", len(ids))

			for _, id := range ids {
				// Check context cancellation
				if ctx.Err() != nil {
					return ctx.Err()
				}

				if err := syncer.SyncShow(ctx, id); err != nil {
					logger.Error("Failed to sync show", "show_id", id, "error", err)
					// Continue to next show
				}

				// Rate limit kindness
				time.Sleep(200 * time.Millisecond)
			}
			return nil
		},
	}
}
