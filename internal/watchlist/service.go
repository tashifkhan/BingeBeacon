package watchlist

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/tashifkhan/bingebeacon/internal/alert"
	"github.com/tashifkhan/bingebeacon/internal/show"
)

type Service struct {
	repo      *Repository
	showRepo  *show.Repository
	alertRepo *alert.Repository
}

func NewService(repo *Repository, showRepo *show.Repository, alertRepo *alert.Repository) *Service {
	return &Service{
		repo:      repo,
		showRepo:  showRepo,
		alertRepo: alertRepo,
	}
}

func (s *Service) List(userID uuid.UUID) ([]Item, error) {
	return s.repo.List(userID)
}

func (s *Service) Add(ctx context.Context, userID uuid.UUID, req AddRequest) error {
	if req.ShowID == uuid.Nil {
		return errors.New("show_id required")
	}
	if _, err := s.showRepo.FindByID(req.ShowID); err != nil {
		return errors.New("show not found")
	}

	priority := req.Priority
	if priority == "" {
		priority = PriorityMedium
	}
	var notes *string
	if req.Notes != "" {
		n := req.Notes
		notes = &n
	}

	item := &Item{
		UserID:   userID,
		ShowID:   req.ShowID,
		Priority: priority,
		Notes:    notes,
	}

	if err := s.repo.Add(item); err != nil {
		return err
	}
	return nil
}

func (s *Service) Update(ctx context.Context, userID, showID uuid.UUID, req UpdateRequest) error {
	item, err := s.repo.Find(userID, showID)
	if err != nil {
		return errors.New("watchlist item not found")
	}
	if req.Priority != "" {
		item.Priority = req.Priority
	}
	if req.Notes != nil {
		item.Notes = req.Notes
	}
	return s.repo.Update(item)
}

func (s *Service) Remove(ctx context.Context, userID, showID uuid.UUID) error {
	return s.repo.Delete(userID, showID)
}

func (s *Service) StartTracking(ctx context.Context, userID, showID uuid.UUID) error {
	// Ensure watchlist entry exists
	if _, err := s.repo.Find(userID, showID); err != nil {
		return errors.New("watchlist item not found")
	}
	// Ensure show exists
	if _, err := s.showRepo.FindByID(showID); err != nil {
		return errors.New("show not found")
	}
	// Create tracking entry
	track := &alert.UserTrackedShow{
		UserID:             userID,
		ShowID:             showID,
		IsFavorite:         false,
		NotifyNewEpisode:   true,
		NotifyNewSeason:    true,
		NotifyStatusChange: true,
		NotifyHoursBefore:  0,
	}
	if err := s.alertRepo.Create(track); err != nil {
		return err
	}
	// Remove from watchlist
	return s.repo.Delete(userID, showID)
}
