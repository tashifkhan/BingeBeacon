package timeline

import (
	"time"

	"github.com/google/uuid"
	"github.com/tashifkhan/bingebeacon/internal/show"
	"gorm.io/datatypes"
)

type TimelineEvent struct {
	ID            uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey"`
	ShowID        uuid.UUID `gorm:"type:uuid;not null;index"`
	EventType     string    `gorm:"type:text;not null"`
	Title         string    `gorm:"type:text;not null"`
	Description   *string   `gorm:"type:text"`
	EventDate     time.Time `gorm:"not null;index"`
	SeasonNumber  *int
	EpisodeNumber *int
	EpisodeID     *uuid.UUID     `gorm:"type:uuid"`
	Metadata      datatypes.JSON `gorm:"type:jsonb;default:'{}'"`
	CreatedAt     time.Time
	Show          show.Show `gorm:"foreignKey:ShowID"`
}
