package jobs

import (
	"context"
	"log/slog"
	"time"

	"github.com/tashifkhan/bingebeacon/internal/metadata"
	"github.com/tashifkhan/bingebeacon/internal/notification"
	"github.com/tashifkhan/bingebeacon/internal/scheduler"
	"github.com/tashifkhan/bingebeacon/internal/show"
)

func NewStaleCleanupJob(
	notifRepo *notification.Repository,
	showRepo *show.Repository,
	syncRepo *metadata.Repository,
	logger *slog.Logger,
) scheduler.Job {
	return scheduler.Job{
		Name:         "stale_cleanup",
		Interval:     24 * time.Hour,
		InitialDelay: untilNextHour(3),
		Run: func(ctx context.Context) error {
			// Cleanup old read notifications > 90 days
			cutoff := time.Now().Add(-90 * 24 * time.Hour)

			notificationsDeleted, err := notifRepo.DeleteOldRead(cutoff)
			if err != nil {
				return err
			}
			prioritiesReset, err := showRepo.ResetUntrackedSyncPriorities(time.Now().Add(-30 * 24 * time.Hour))
			if err != nil {
				return err
			}
			logsDeleted, err := syncRepo.DeleteOlderThan(time.Now().Add(-30 * 24 * time.Hour))
			if err != nil {
				return err
			}

			logger.Info("Cleaned up stale data",
				"notifications_deleted", notificationsDeleted,
				"show_priorities_reset", prioritiesReset,
				"sync_logs_deleted", logsDeleted,
			)
			return nil
		},
	}
}

func untilNextHour(hour int) time.Duration {
	now := time.Now()
	next := time.Date(now.Year(), now.Month(), now.Day(), hour, 0, 0, 0, now.Location())
	if !next.After(now) {
		next = next.AddDate(0, 0, 1)
	}
	return time.Until(next)
}
