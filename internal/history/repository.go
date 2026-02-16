package history

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(userID uuid.UUID, showID *uuid.UUID, limit int) ([]Entry, error) {
	var entries []Entry
	query := r.db.Preload("Show").Preload("Episode").Where("user_id = ?", userID)
	if showID != nil {
		query = query.Where("show_id = ?", *showID)
	}
	err := query.Order("watched_at DESC").Limit(limit).Find(&entries).Error
	return entries, err
}

func (r *Repository) ListByShow(userID, showID uuid.UUID) ([]Entry, error) {
	var entries []Entry
	err := r.db.Where("user_id = ? AND show_id = ?", userID, showID).
		Order("season_number ASC, episode_number ASC").Find(&entries).Error
	return entries, err
}

func (r *Repository) Create(entry *Entry) error {
	return r.db.Create(entry).Error
}

func (r *Repository) Update(entry *Entry) error {
	return r.db.Save(entry).Error
}

func (r *Repository) CreateBatch(entries []Entry) error {
	return r.db.CreateInBatches(entries, 100).Error
}

func (r *Repository) GetByID(userID, id uuid.UUID) (*Entry, error) {
	var entry Entry
	if err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&entry).Error; err != nil {
		return nil, err
	}
	return &entry, nil
}

func (r *Repository) Delete(id uuid.UUID, userID uuid.UUID) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&Entry{}).Error
}

func (r *Repository) GetStats(userID uuid.UUID) (*Stats, error) {
	var stats Stats
	var count int64

	err := r.db.Model(&Entry{}).Where("user_id = ?", userID).Count(&count).Error
	if err != nil {
		return nil, err
	}
	stats.TotalEpisodes = int(count)

	err = r.db.Model(&Entry{}).Where("user_id = ?", userID).Distinct("show_id").Count(&count).Error
	if err != nil {
		return nil, err
	}
	stats.TotalShows = int(count)

	return &stats, nil
}

func (r *Repository) GetShowProgress(userID, showID uuid.UUID) (int, error) {
	var count int64
	err := r.db.Model(&Entry{}).Where("user_id = ? AND show_id = ?", userID, showID).Count(&count).Error
	return int(count), err
}

func (r *Repository) FindEntry(userID, showID uuid.UUID, season, episode int) (*Entry, error) {
	var entry Entry
	err := r.db.Where("user_id = ? AND show_id = ? AND season_number = ? AND episode_number = ?",
		userID, showID, season, episode).First(&entry).Error
	if err != nil {
		return nil, err
	}
	return &entry, nil
}
