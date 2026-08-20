package jobs

import (
	"context"
	"log/slog"
	"time"

	"github.com/tashifkhan/bingebeacon/internal/metadata"
	"github.com/tashifkhan/bingebeacon/internal/scheduler"
	"github.com/tashifkhan/bingebeacon/internal/show"
)

func NewEpisodeSyncJob(
	syncer *metadata.Syncer,
	showRepo *show.Repository,
	logger *slog.Logger,
) scheduler.Job {
	return scheduler.Job{
		Name:     "episode_sync",
		Interval: 6 * time.Hour,
		Run: func(ctx context.Context) error {
			// 1. Get tracked show IDs
			// Ideally we prioritize "returning" shows.
			// For Phase 1/2, just sync all tracked shows.
			shows, err := showRepo.GetTrackedForSync(100)
			if err != nil {
				return err
			}

			logger.Info("Starting prioritized sync", "shows_count", len(shows))

			for _, trackedShow := range shows {
				// Check context cancellation
				if ctx.Err() != nil {
					return ctx.Err()
				}

				if err := syncer.SyncShow(ctx, trackedShow.ID); err != nil {
					logger.Error("Failed to sync show", "show_id", trackedShow.ID, "error", err)
					// Continue to next show
				}

				// Rate limit kindness
				time.Sleep(200 * time.Millisecond)
			}
			return nil
		},
	}
}
