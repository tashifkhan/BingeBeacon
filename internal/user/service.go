package user

import (
	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type UserProfile struct {
	ID       uuid.UUID    `json:"id"`
	Email    string       `json:"email"`
	Username string       `json:"username"`
	Timezone string       `json:"timezone"`
	Devices  []UserDevice `json:"devices"`
}

type UpdateProfileRequest struct {
	Timezone string `json:"timezone"`
}

type RegisterDeviceRequest struct {
	DeviceToken string `json:"device_token"`
	Platform    string `json:"platform"`
}

func (s *Service) GetProfile(userID uuid.UUID) (*UserProfile, error) {
	u, err := s.repo.FindByID(userID)
	if err != nil {
		return nil, err
	}

	devices, err := s.repo.GetDevices(userID)
	if err != nil {
		return nil, err
	}

	return &UserProfile{
		ID:       u.ID,
		Email:    u.Email,
		Username: u.Username,
		Timezone: u.Timezone,
		Devices:  devices,
	}, nil
}

func (s *Service) UpdateProfile(userID uuid.UUID, req UpdateProfileRequest) error {
	u, err := s.repo.FindByID(userID)
	if err != nil {
		return err
	}

	if req.Timezone != "" {
		u.Timezone = req.Timezone
	}

	return s.repo.Update(u)
}

func (s *Service) RegisterDevice(userID uuid.UUID, req RegisterDeviceRequest) error {
	// Simple upsert logic: if token exists for user, update platform/active, else create
	// For now, assume create. A proper upsert query would be better.

	// Check if device exists
	// Implementation simplified for MVP
	device := &UserDevice{
		UserID:      userID,
		DeviceToken: req.DeviceToken,
		Platform:    req.Platform,
		IsActive:    true,
	}
	return s.repo.AddDevice(device)
}

func (s *Service) UnregisterDevice(userID, deviceID uuid.UUID) error {
	return s.repo.RemoveDevice(deviceID, userID)
}
