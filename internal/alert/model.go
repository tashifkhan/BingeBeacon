package alert

import (
	"time"

	"github.com/google/uuid"
	"github.com/tashifkhan/bingebeacon/internal/show"
)

type UserTrackedShow struct {
	ID                 uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey"`
	UserID             uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_user_show"`
	ShowID             uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_user_show"`
	IsFavorite         bool      `gorm:"not null;default:false"`
	NotifyNewEpisode   bool      `gorm:"not null;default:true"`
	NotifyNewSeason    bool      `gorm:"not null;default:true"`
	NotifyStatusChange bool      `gorm:"not null;default:true"`
	NotifyHoursBefore  int       `gorm:"not null;default:0"`
	LastWatchedSeason  *int
	LastWatchedEpisode *int
	CreatedAt          time.Time
	UpdatedAt          time.Time
	Show               show.Show `gorm:"foreignKey:ShowID"`
}
