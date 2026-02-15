package show

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/datatypes"
)

type Show struct {
	ID           uuid.UUID      `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Title        string         `gorm:"type:text;not null" json:"title"`
	MediaType    string         `gorm:"type:text;not null" json:"media_type"`
	Status       *string        `gorm:"type:text" json:"status"`
	Overview     *string        `gorm:"type:text" json:"overview"`
	PosterURL    *string        `gorm:"type:text" json:"poster_url"`
	BackdropURL  *string        `gorm:"type:text" json:"backdrop_url"`
	Genres       pq.StringArray `gorm:"type:text[]" json:"genres"`
	Network      *string        `gorm:"type:text" json:"network"`
	PremiereDate *time.Time     `gorm:"type:date" json:"premiere_date"`
	TMDBID       *int           `gorm:"uniqueIndex" json:"tmdb_id"`
	IMDBID       *string        `gorm:"uniqueIndex" json:"imdb_id"`
	TheTVDBID    *int           `gorm:"uniqueIndex" json:"thetvdb_id"`
	OMDBID       *string        `json:"omdb_id"`
	LastSyncedAt time.Time      `json:"last_synced_at"`
	SyncPriority int            `gorm:"not null;default:0" json:"sync_priority"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	Seasons      []Season       `gorm:"foreignKey:ShowID" json:"seasons"`
	Ratings      datatypes.JSON `gorm:"type:jsonb" json:"ratings"`
}

type Season struct {
	ID           uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	ShowID       uuid.UUID  `gorm:"type:uuid;not null;index" json:"show_id"`
	SeasonNumber int        `gorm:"not null" json:"season_number"`
	Name         *string    `gorm:"type:text" json:"name"`
	Overview     *string    `gorm:"type:text" json:"overview"`
	PosterURL    *string    `gorm:"type:text" json:"poster_url"`
	AirDate      *time.Time `gorm:"type:date" json:"air_date"`
	EpisodeCount *int       `json:"episode_count"`
	TMDBID       *int       `json:"tmdb_id"`
	TheTVDBID    *int       `json:"thetvdb_id"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	Episodes     []Episode  `gorm:"foreignKey:SeasonID" json:"episodes"`
}

type Episode struct {
	ID             uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	ShowID         uuid.UUID  `gorm:"type:uuid;not null;index" json:"show_id"`
	SeasonID       uuid.UUID  `gorm:"type:uuid;not null;index" json:"season_id"`
	SeasonNumber   int        `gorm:"not null" json:"season_number"`
	EpisodeNumber  int        `gorm:"not null" json:"episode_number"`
	Title          *string    `gorm:"type:text" json:"title"`
	Overview       *string    `gorm:"type:text" json:"overview"`
	AirDate        *time.Time `gorm:"type:date" json:"air_date"`
	RuntimeMinutes *int       `json:"runtime_minutes"`
	StillURL       *string    `gorm:"type:text" json:"still_url"`
	TMDBID         *int       `json:"tmdb_id"`
	TheTVDBID      *int       `json:"thetvdb_id"`
	IMDBID         *string    `json:"imdb_id"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}
