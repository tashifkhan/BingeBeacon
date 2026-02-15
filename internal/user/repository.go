package user

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

func (r *Repository) Create(user *User) error {
	return r.db.Create(user).Error
}

func (r *Repository) FindByID(id uuid.UUID) (*User, error) {
	var user User
	if err := r.db.First(&user, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *Repository) FindByEmail(email string) (*User, error) {
	var user User
	if err := r.db.First(&user, "email = ?", email).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *Repository) Update(user *User) error {
	return r.db.Save(user).Error
}

func (r *Repository) AddDevice(device *UserDevice) error {
	return r.db.Create(device).Error
}

func (r *Repository) RemoveDevice(deviceID, userID uuid.UUID) error {
	return r.db.Delete(&UserDevice{}, "id = ? AND user_id = ?", deviceID, userID).Error
}

func (r *Repository) GetDevices(userID uuid.UUID) ([]UserDevice, error) {
	var devices []UserDevice
	if err := r.db.Find(&devices, "user_id = ?", userID).Error; err != nil {
		return nil, err
	}
	return devices, nil
}
