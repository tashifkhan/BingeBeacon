package jobs

import (
	"context"
	"log/slog"
	"time"

	"github.com/tashifkhan/bingebeacon/internal/notification"
	"github.com/tashifkhan/bingebeacon/internal/scheduler"
)

func NewStaleCleanupJob(
	notifRepo *notification.Repository,
	logger *slog.Logger,
) scheduler.Job {
	return scheduler.Job{
		Name:     "stale_cleanup",
		Interval: 24 * time.Hour,
		Run: func(ctx context.Context) error {
			// Cleanup old read notifications > 90 days
			cutoff := time.Now().Add(-90 * 24 * time.Hour)

			count, err := notifRepo.DeleteOldRead(cutoff)
			if err != nil {
				return err
			}

			logger.Info("Cleaned up stale data", "notifications_deleted", count)
			return nil
		},
	}
}
