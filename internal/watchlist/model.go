package watchlist

import (
	"time"

	"github.com/google/uuid"
	"github.com/tashifkhan/bingebeacon/internal/show"
)

type Priority string

const (
	PriorityHigh   Priority = "high"
	PriorityMedium Priority = "medium"
	PriorityLow    Priority = "low"
)

type Item struct {
	ID       uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	UserID   uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	ShowID   uuid.UUID `gorm:"type:uuid;not null" json:"show_id"`
	Priority Priority  `gorm:"type:watchlist_priority;not null;default:'medium'" json:"priority"`
	Notes    *string   `gorm:"type:text" json:"notes"`
	AddedAt  time.Time `gorm:"not null;default:now()" json:"added_at"`
	Show     show.Show `gorm:"foreignKey:ShowID" json:"show"`
}

// TableName overrides the table name used by User to `watchlist_items`
func (Item) TableName() string {
	return "watchlist_items"
}

type AddRequest struct {
	ShowID   uuid.UUID `json:"show_id" validate:"required"`
	Priority Priority  `json:"priority" validate:"omitempty,oneof=high medium low"`
	Notes    string    `json:"notes"`
}

type UpdateRequest struct {
	Priority Priority `json:"priority" validate:"omitempty,oneof=high medium low"`
	Notes    *string  `json:"notes"`
}
