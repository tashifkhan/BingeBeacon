package notification

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type Notification struct {
	ID              uuid.UUID      `gorm:"type:uuid;default:uuid_generate_v4();primaryKey"`
	UserID          uuid.UUID      `gorm:"type:uuid;not null;index"`
	TimelineEventID *uuid.UUID     `gorm:"type:uuid"`
	Title           string         `gorm:"type:text;not null"`
	Body            string         `gorm:"type:text;not null"`
	Payload         datatypes.JSON `gorm:"type:jsonb;default:'{}'"`
	Status          string         `gorm:"type:text;not null;default:'pending'"` // pending, sent, failed, read
	ScheduledFor    time.Time      `gorm:"not null;index"`
	SentAt          *time.Time
	ReadAt          *time.Time
	CreatedAt       time.Time
}
