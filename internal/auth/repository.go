package auth

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

func (r *Repository) CreateRefreshToken(token *RefreshToken) error {
	return r.db.Create(token).Error
}

func (r *Repository) FindRefreshToken(tokenStr string) (*RefreshToken, error) {
	var token RefreshToken
	if err := r.db.Preload("User").Where("token = ?", tokenStr).First(&token).Error; err != nil {
		return nil, err
	}
	return &token, nil
}

func (r *Repository) DeleteRefreshToken(tokenStr string) error {
	return r.db.Where("token = ?", tokenStr).Delete(&RefreshToken{}).Error
}

func (r *Repository) DeleteAllUserRefreshTokens(userID uuid.UUID) error {
	return r.db.Where("user_id = ?", userID).Delete(&RefreshToken{}).Error
}
