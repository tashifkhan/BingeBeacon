package notification

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(notif *Notification) error {
	return r.db.Create(notif).Error
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

func (r *Repository) MarkRead(id uuid.UUID, userID uuid.UUID) error {
	now := time.Now()
	return r.db.Model(&Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Updates(map[string]interface{}{
			"status":  "read",
			"read_at": now,
		}).Error
}

func (r *Repository) MarkAllRead(userID uuid.UUID) error {
	now := time.Now()
	// Update all unread notifications to 'read'
	return r.db.Model(&Notification{}).
		Where("user_id = ? AND status != ?", userID, "read").
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
		db = db.Where("type = ?", notifType)
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
