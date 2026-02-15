package jobs

import (
	"context"
	"log/slog"
	"time"

	"github.com/tashifkhan/bingebeacon/internal/notification"
	"github.com/tashifkhan/bingebeacon/internal/scheduler"
	"github.com/tashifkhan/bingebeacon/internal/user"
)

func NewNotificationDispatchJob(
	notifRepo *notification.Repository,
	userRepo *user.Repository,
	fcm *notification.FCMClient,
	logger *slog.Logger,
) scheduler.Job {
	return scheduler.Job{
		Name:     "notification_dispatch",
		Interval: 1 * time.Minute,
		Run: func(ctx context.Context) error {
			// 1. Get pending notifications due
			notifs, err := notifRepo.GetPendingDue(500)
			if err != nil {
				return err
			}

			if len(notifs) == 0 {
				return nil
			}

			logger.Info("Dispatching notifications", "count", len(notifs))

			for _, n := range notifs {
				if ctx.Err() != nil {
					return ctx.Err()
				}

				// 2. Get user devices
				devices, err := userRepo.GetDevices(n.UserID)
				if err != nil {
					logger.Error("Failed to get user devices", "user_id", n.UserID, "error", err)
					notifRepo.MarkFailed(n.ID)
					continue
				}

				if len(devices) == 0 {
					logger.Info("No devices for user", "user_id", n.UserID)
					// Mark as sent (or failed?) so we don't retry forever.
					// Let's mark as sent effectively (or skipped)
					notifRepo.MarkSent(n.ID) // Treat as delivered to inbox
					continue
				}

				// 3. Send via FCM
				sentCount := 0
				for _, d := range devices {
					if !d.IsActive {
						continue
					}

					// Should verify token format etc.
					err := fcm.SendToDevice(ctx, d.DeviceToken, n.Title, n.Body, nil)
					if err != nil {
						logger.Error("FCM send failed", "device_id", d.ID, "error", err)
						// If invalid token, deactivate device?
					} else {
						sentCount++
					}
				}

				if sentCount > 0 {
					notifRepo.MarkSent(n.ID)
				} else {
					// All failed
					notifRepo.MarkFailed(n.ID)
				}
			}
			return nil
		},
	}
}
