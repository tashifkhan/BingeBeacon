package user

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey"`
	Email        string    `gorm:"type:text;not null;uniqueIndex"`
	Username     string    `gorm:"type:text;not null;uniqueIndex"`
	PasswordHash string    `gorm:"type:text;not null"`
	Timezone     string    `gorm:"type:text;not null;default:'UTC'"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	Devices      []UserDevice `gorm:"foreignKey:UserID"`
}

type UserDevice struct {
	ID          uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	UserID      uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	DeviceToken string    `gorm:"type:text;not null" json:"device_token"`
	Platform    string    `gorm:"type:text;not null" json:"platform"`
	IsActive    bool      `gorm:"not null;default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
