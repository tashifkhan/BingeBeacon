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
	ID          uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey"`
	UserID      uuid.UUID `gorm:"type:uuid;not null;index"`
	DeviceToken string    `gorm:"type:text;not null"`
	Platform    string    `gorm:"type:text;not null"`
	IsActive    bool      `gorm:"not null;default:true"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
