package show

import (
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

func (r *Repository) Create(show *Show) error {
	return r.db.Create(show).Error
}

func (r *Repository) UpsertSearchResult(item *Show) error {
	return r.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "tmdb_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"title", "media_type", "overview", "poster_url", "backdrop_url", "premiere_date", "updated_at",
		}),
	}, clause.Returning{Columns: []clause.Column{{Name: "id"}}}).Create(item).Error
}

func (r *Repository) FindByID(id uuid.UUID) (*Show, error) {
	var show Show
	if err := r.db.Preload("Seasons.Episodes").First(&show, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &show, nil
}

func (r *Repository) FindByTMDBID(tmdbID int) (*Show, error) {
	var show Show
	if err := r.db.Preload("Seasons").First(&show, "tmdb_id = ?", tmdbID).Error; err != nil {
		return nil, err
	}
	return &show, nil
}

func (r *Repository) Search(query string, mediaType string, limit int) ([]Show, error) {
	var shows []Show
	// Use pg_trgm similarity
	// Note: You need to ensure the extension is enabled and index exists
	db := r.db.Where("similarity(title, ?) > 0.3", query).
		Order(gorm.Expr("similarity(title, ?) DESC", query))

	if mediaType != "" {
		db = db.Where("media_type = ?", mediaType)
	}

	if err := db.Limit(limit).Find(&shows).Error; err != nil {
		return nil, err
	}
	return shows, nil
}

func (r *Repository) UpsertFromTMDB(show *Show) error {
	// Use OnConflict to upsert based on tmdb_id
	// GORM's Save/Updates might not be enough for deep upsert of seasons/episodes
	// For simplicity in Phase 1, we might just check existence and update
	// But proper way is using Clauses
	return r.db.Save(show).Error
}

func (r *Repository) GetWithSeasons(id uuid.UUID) (*Show, error) {
	var show Show
	if err := r.db.Preload("Seasons").First(&show, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &show, nil
}

func (r *Repository) GetSeasonWithEpisodes(showID uuid.UUID, seasonNum int) (*Season, error) {
	var season Season
	if err := r.db.Preload("Episodes").
		Where("show_id = ? AND season_number = ?", showID, seasonNum).
		First(&season).Error; err != nil {
		return nil, err
	}
	return &season, nil
}

func (r *Repository) GetEpisodes(showID uuid.UUID, upcoming bool) ([]Episode, error) {
	var episodes []Episode
	db := r.db.Where("show_id = ?", showID)
	if upcoming {
		db = db.Where("air_date >= CURRENT_DATE")
	}
	db = db.Order("air_date ASC, season_number ASC, episode_number ASC")

	if err := db.Find(&episodes).Error; err != nil {
		return nil, err
	}
	return episodes, nil
}

func (r *Repository) GetEpisodeByNumber(showID uuid.UUID, seasonNum, episodeNum int) (*Episode, error) {
	var episode Episode
	if err := r.db.Where("show_id = ? AND season_number = ? AND episode_number = ?", showID, seasonNum, episodeNum).
		First(&episode).Error; err != nil {
		return nil, err
	}
	return &episode, nil
}

func (r *Repository) GetTrackedForSync(limit int) ([]Show, error) {
	var shows []Show
	err := r.db.Table("shows").
		Select("shows.*").
		Joins("INNER JOIN user_tracked_shows uts ON uts.show_id = shows.id").
		Group("shows.id").
		Order("shows.sync_priority DESC, shows.last_synced_at ASC").
		Limit(limit).
		Find(&shows).Error
	return shows, err
}

func (r *Repository) FindByTMDBIDs(mediaType string, ids []int) ([]Show, error) {
	if len(ids) == 0 {
		return []Show{}, nil
	}
	var shows []Show
	err := r.db.Where("media_type = ? AND tmdb_id IN ?", mediaType, ids).Find(&shows).Error
	return shows, err
}

func (r *Repository) BumpSyncPriority(showID uuid.UUID) error {
	return r.db.Model(&Show{}).Where("id = ?", showID).
		UpdateColumn("sync_priority", gorm.Expr("sync_priority + 1")).Error
}

func (r *Repository) ResetUntrackedSyncPriorities(cutoff time.Time) (int64, error) {
	result := r.db.Model(&Show{}).
		Where("sync_priority > 0 AND last_synced_at < ?", cutoff).
		Where("NOT EXISTS (SELECT 1 FROM user_tracked_shows uts WHERE uts.show_id = shows.id)").
		Update("sync_priority", 0)
	return result.RowsAffected, result.Error
}

func (r *Repository) CountEpisodes(showID uuid.UUID) (int, error) {
	var count int64
	if err := r.db.Model(&Episode{}).Where("show_id = ?", showID).Count(&count).Error; err != nil {
		return 0, err
	}
	return int(count), nil
}

func (r *Repository) UpsertSeason(season *Season) error {
	// Find existing or create
	var existing Season
	err := r.db.Where("show_id = ? AND season_number = ?", season.ShowID, season.SeasonNumber).First(&existing).Error
	if err == nil {
		season.ID = existing.ID
		return r.db.Model(&existing).Updates(season).Error
	}
	if err == gorm.ErrRecordNotFound {
		return r.db.Create(season).Error
	}
	return err
}

func (r *Repository) UpsertEpisode(episode *Episode) (bool, error) {
	var existing Episode
	err := r.db.Where("show_id = ? AND season_number = ? AND episode_number = ?",
		episode.ShowID, episode.SeasonNumber, episode.EpisodeNumber).First(&existing).Error
	if err == nil {
		episode.ID = existing.ID
		return false, r.db.Model(&existing).Updates(episode).Error
	}
	if err == gorm.ErrRecordNotFound {
		return true, r.db.Create(episode).Error
	}
	return false, err
}
