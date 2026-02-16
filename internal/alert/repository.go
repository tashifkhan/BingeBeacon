package alert

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

func (r *Repository) Create(track *UserTrackedShow) error {
	return r.db.Create(track).Error
}

func (r *Repository) FindByUserAndShow(userID, showID uuid.UUID) (*UserTrackedShow, error) {
	var track UserTrackedShow
	if err := r.db.Where("user_id = ? AND show_id = ?", userID, showID).First(&track).Error; err != nil {
		return nil, err
	}
	return &track, nil
}

func (r *Repository) GetAllByUser(userID uuid.UUID) ([]UserTrackedShow, error) {
	var tracks []UserTrackedShow
	if err := r.db.Preload("Show").Where("user_id = ?", userID).Find(&tracks).Error; err != nil {
		return nil, err
	}
	return tracks, nil
}

func (r *Repository) GetFavorites(userID uuid.UUID) ([]UserTrackedShow, error) {
	var tracks []UserTrackedShow
	if err := r.db.Preload("Show").Where("user_id = ? AND is_favorite = ?", userID, true).Find(&tracks).Error; err != nil {
		return nil, err
	}
	return tracks, nil
}

func (r *Repository) Update(track *UserTrackedShow) error {
	return r.db.Save(track).Error
}

func (r *Repository) UpdateLastWatched(userID, showID uuid.UUID, seasonNumber, episodeNumber int) error {
	return r.db.Model(&UserTrackedShow{}).
		Where("user_id = ? AND show_id = ?", userID, showID).
		Updates(map[string]interface{}{
			"last_watched_season":  seasonNumber,
			"last_watched_episode": episodeNumber,
			"updated_at":           time.Now(),
		}).Error
}

func (r *Repository) Delete(userID, showID uuid.UUID) error {
	return r.db.Where("user_id = ? AND show_id = ?", userID, showID).Delete(&UserTrackedShow{}).Error
}

func (r *Repository) GetUsersTrackingShow(showID uuid.UUID) ([]UserTrackedShow, error) {
	var tracks []UserTrackedShow
	if err := r.db.Where("show_id = ?", showID).Find(&tracks).Error; err != nil {
		return nil, err
	}
	return tracks, nil
}

func (r *Repository) GetDistinctTrackedShowIDs() ([]uuid.UUID, error) {
	var ids []uuid.UUID
	if err := r.db.Model(&UserTrackedShow{}).Distinct("show_id").Pluck("show_id", &ids).Error; err != nil {
		return nil, err
	}
	return ids, nil
}
