package metadata

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SyncLog struct {
	ID             uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Source         string     `json:"source"`
	ShowID         *uuid.UUID `json:"show_id,omitempty"`
	Status         string     `json:"status"`
	RecordsUpdated int        `json:"records_updated"`
	ErrorMessage   *string    `json:"error_message,omitempty"`
	StartedAt      time.Time  `json:"started_at"`
	FinishedAt     *time.Time `json:"finished_at,omitempty"`
}

func (SyncLog) TableName() string { return "sync_log" }

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Start(source string, showID *uuid.UUID) (*SyncLog, error) {
	entry := &SyncLog{Source: source, ShowID: showID, Status: "running", StartedAt: time.Now()}
	if err := r.db.Create(entry).Error; err != nil {
		return nil, err
	}
	return entry, nil
}

func (r *Repository) Finish(id uuid.UUID, status string, recordsUpdated int, syncErr error) error {
	now := time.Now()
	updates := map[string]interface{}{
		"status": status, "records_updated": recordsUpdated, "finished_at": now,
	}
	if syncErr != nil {
		message := syncErr.Error()
		updates["error_message"] = message
	}
	return r.db.Model(&SyncLog{}).Where("id = ?", id).Updates(updates).Error
}

func (r *Repository) Recent(limit int) ([]SyncLog, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	var entries []SyncLog
	err := r.db.Order("started_at DESC").Limit(limit).Find(&entries).Error
	return entries, err
}

func (r *Repository) DeleteOlderThan(cutoff time.Time) (int64, error) {
	result := r.db.Where("started_at < ?", cutoff).Delete(&SyncLog{})
	return result.RowsAffected, result.Error
}
