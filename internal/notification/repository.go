package notification

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(notif *Notification) error {
	return r.db.Clauses(clause.OnConflict{DoNothing: true}).Create(notif).Error
}

func (r *Repository) GetPendingDue(limit int) ([]Notification, error) {
	var notifs []Notification
	err := r.db.Where("status = ? AND scheduled_for <= ?", "pending", time.Now()).
		Limit(limit).
		Find(&notifs).Error
	if err != nil {
		return nil, err
	}
	return notifs, nil
}

func (r *Repository) MarkSent(id uuid.UUID) error {
	now := time.Now()
	return r.db.Model(&Notification{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":  "sent",
			"sent_at": now,
		}).Error
}

func (r *Repository) MarkFailed(id uuid.UUID) error {
	return r.db.Model(&Notification{}).
		Where("id = ?", id).
		Update("status", "failed").Error
}

func (r *Repository) RetryOrFail(id uuid.UUID, dispatchErr error, maxAttempts int) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var notif Notification
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&notif, "id = ?", id).Error; err != nil {
			return err
		}
		notif.RetryCount++
		message := "notification delivery failed"
		if dispatchErr != nil {
			message = dispatchErr.Error()
		}
		notif.LastError = &message
		if notif.RetryCount >= maxAttempts {
			notif.Status = "failed"
		} else {
			notif.Status = "pending"
			notif.ScheduledFor = time.Now().Add(time.Duration(1<<notif.RetryCount) * time.Minute)
		}
		return tx.Model(&Notification{}).Where("id = ?", id).Updates(map[string]interface{}{
			"status": notif.Status, "retry_count": notif.RetryCount,
			"last_error": message, "scheduled_for": notif.ScheduledFor,
		}).Error
	})
}

func (r *Repository) ClaimPendingDue(limit int) ([]Notification, error) {
	if limit <= 0 {
		return nil, fmt.Errorf("limit must be positive")
	}
	var notifications []Notification
	err := r.db.Raw(`
		WITH due AS (
			SELECT id FROM notifications
			WHERE status = 'pending' AND scheduled_for <= NOW()
			ORDER BY scheduled_for ASC
			FOR UPDATE SKIP LOCKED
			LIMIT ?
		)
		UPDATE notifications AS n
		SET scheduled_for = NOW() + INTERVAL '5 minutes'
		FROM due
		WHERE n.id = due.id
		RETURNING n.*
	`, limit).Scan(&notifications).Error
	return notifications, err
}

func (r *Repository) MarkRead(id uuid.UUID, userID uuid.UUID) error {
	now := time.Now()
	return r.db.Model(&Notification{}).
		Where("id = ? AND user_id = ? AND status = ?", id, userID, "sent").
		Updates(map[string]interface{}{
			"status":  "read",
			"read_at": now,
		}).Error
}

func (r *Repository) MarkAllRead(userID uuid.UUID) error {
	now := time.Now()
	// Update all unread notifications to 'read'
	return r.db.Model(&Notification{}).
		Where("user_id = ? AND status = ?", userID, "sent").
		Updates(map[string]interface{}{
			"status":  "read",
			"read_at": now,
		}).Error
}

func (r *Repository) GetByUser(userID uuid.UUID, status string, notifType string, from, to *time.Time, page, perPage int) ([]Notification, int64, error) {
	var notifs []Notification
	var total int64

	db := r.db.Model(&Notification{}).Where("user_id = ?", userID)

	if status != "" {
		db = db.Where("status = ?", status)
	}

	if notifType != "" {
		db = db.Where("payload ->> 'type' = ?", notifType)
	}

	if from != nil {
		db = db.Where("created_at >= ?", from)
	}

	if to != nil {
		db = db.Where("created_at <= ?", to)
	}

	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := db.Order("created_at DESC").
		Limit(perPage).
		Offset(offset).
		Find(&notifs).Error

	if err != nil {
		return nil, 0, err
	}

	return notifs, total, nil
}

func (r *Repository) GetUnreadCount(userID uuid.UUID) (int64, error) {
	var count int64
	// Count all non-read notifications? Or just 'sent'?
	// Usually badge count assumes 'sent' notifications that haven't been 'read'.
	err := r.db.Model(&Notification{}).
		Where("user_id = ? AND status = ?", userID, "sent").
		Count(&count).Error
	return count, err
}

func (r *Repository) DeleteOldRead(olderThan time.Time) (int64, error) {
	result := r.db.Where("status = ? AND created_at < ?", "read", olderThan).
		Delete(&Notification{})
	return result.RowsAffected, result.Error
}
