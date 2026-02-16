package history

import (
	"time"

	"github.com/google/uuid"
	"github.com/tashifkhan/bingebeacon/internal/show"
)

type Entry struct {
	ID            uuid.UUID     `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	UserID        uuid.UUID     `gorm:"type:uuid;not null" json:"user_id"`
	ShowID        uuid.UUID     `gorm:"type:uuid;not null" json:"show_id"`
	SeasonNumber  int           `gorm:"not null" json:"season_number"`
	EpisodeNumber int           `gorm:"not null" json:"episode_number"`
	EpisodeID     *uuid.UUID    `gorm:"type:uuid" json:"episode_id"`
	Rating        *int          `json:"rating"` // 1-10
	Notes         *string       `gorm:"type:text" json:"notes"`
	WatchedAt     time.Time     `gorm:"not null;default:now()" json:"watched_at"`
	Show          show.Show     `gorm:"foreignKey:ShowID" json:"show"`
	Episode       *show.Episode `gorm:"foreignKey:EpisodeID" json:"episode,omitempty"`
}

// TableName overrides the table name used by User to `watch_history_entries`
func (Entry) TableName() string {
	return "watch_history_entries"
}

type CreateEntryRequest struct {
	ShowID        uuid.UUID  `json:"show_id" validate:"required"`
	SeasonNumber  int        `json:"season_number" validate:"required"`
	EpisodeNumber int        `json:"episode_number" validate:"required"`
	Rating        *int       `json:"rating" validate:"omitempty,min=1,max=10"`
	Notes         *string    `json:"notes"`
	WatchedAt     *time.Time `json:"watched_at"`
}

type BatchCreateRequest struct {
	ShowID         uuid.UUID `json:"show_id" validate:"required"`
	SeasonNumber   int       `json:"season_number" validate:"required"`
	EpisodeNumbers []int     `json:"episode_numbers"` // If empty, mark whole season
}

type Stats struct {
	TotalEpisodes int `json:"total_episodes"`
	TotalShows    int `json:"total_shows"`
}

type Progress struct {
	TotalEpisodes   int     `json:"total_episodes"`
	WatchedEpisodes int     `json:"watched_episodes"`
	PercentComplete float64 `json:"percent_complete"`
	NextEpisode     *struct {
		SeasonNumber  int `json:"season_number"`
		EpisodeNumber int `json:"episode_number"`
	} `json:"next_episode,omitempty"`
}
