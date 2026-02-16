package watchlist

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

func (r *Repository) List(userID uuid.UUID) ([]Item, error) {
	var items []Item
	order := "CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, added_at DESC"
	err := r.db.Preload("Show").Where("user_id = ?", userID).Order(order).Find(&items).Error
	return items, err
}

func (r *Repository) Add(item *Item) error {
	return r.db.Create(item).Error
}

func (r *Repository) Update(item *Item) error {
	return r.db.Save(item).Error
}

func (r *Repository) Delete(userID, showID uuid.UUID) error {
	return r.db.Where("user_id = ? AND show_id = ?", userID, showID).Delete(&Item{}).Error
}

func (r *Repository) Find(userID, showID uuid.UUID) (*Item, error) {
	var item Item
	err := r.db.Where("user_id = ? AND show_id = ?", userID, showID).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}
