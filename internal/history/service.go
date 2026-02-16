package history

import (
	"context"
	"errors"
	"math"
	"time"

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

func (s *Service) List(userID uuid.UUID, showID *uuid.UUID, limit int) ([]Entry, error) {
	return s.repo.List(userID, showID, limit)
}

func (s *Service) Create(ctx context.Context, userID uuid.UUID, req CreateEntryRequest) error {
	if req.ShowID == uuid.Nil {
		return errors.New("show_id required")
	}
	if _, err := s.showRepo.FindByID(req.ShowID); err != nil {
		return errors.New("show not found")
	}
	if req.SeasonNumber <= 0 || req.EpisodeNumber <= 0 {
		return errors.New("season_number and episode_number required")
	}
	if req.Rating != nil && (*req.Rating < 1 || *req.Rating > 10) {
		return errors.New("rating must be 1-10")
	}

	var episodeID *uuid.UUID
	if ep, err := s.showRepo.GetEpisodeByNumber(req.ShowID, req.SeasonNumber, req.EpisodeNumber); err == nil {
		episodeID = &ep.ID
	}

	watchedAt := time.Now()
	if req.WatchedAt != nil {
		watchedAt = *req.WatchedAt
	}

	entry := &Entry{
		UserID:        userID,
		ShowID:        req.ShowID,
		SeasonNumber:  req.SeasonNumber,
		EpisodeNumber: req.EpisodeNumber,
		EpisodeID:     episodeID,
		Rating:        req.Rating,
		Notes:         req.Notes,
		WatchedAt:     watchedAt,
	}

	if err := s.repo.Create(entry); err != nil {
		return err
	}

	// Update last watched on tracked show (if tracked)
	_ = s.alertRepo.UpdateLastWatched(userID, req.ShowID, req.SeasonNumber, req.EpisodeNumber)

	return nil
}

func (s *Service) CreateBatch(ctx context.Context, userID uuid.UUID, req BatchCreateRequest) error {
	if req.ShowID == uuid.Nil {
		return errors.New("show_id required")
	}
	if req.SeasonNumber <= 0 {
		return errors.New("season_number required")
	}
	if _, err := s.showRepo.FindByID(req.ShowID); err != nil {
		return errors.New("show not found")
	}

	if len(req.EpisodeNumbers) == 0 {
		return errors.New("episode_numbers required")
	}

	entries := make([]Entry, 0, len(req.EpisodeNumbers))
	for _, epNum := range req.EpisodeNumbers {
		if epNum <= 0 {
			continue
		}
		var episodeID *uuid.UUID
		if ep, err := s.showRepo.GetEpisodeByNumber(req.ShowID, req.SeasonNumber, epNum); err == nil {
			episodeID = &ep.ID
		}
		entries = append(entries, Entry{
			UserID:        userID,
			ShowID:        req.ShowID,
			SeasonNumber:  req.SeasonNumber,
			EpisodeNumber: epNum,
			EpisodeID:     episodeID,
			WatchedAt:     time.Now(),
		})
	}

	if len(entries) == 0 {
		return errors.New("no valid episodes")
	}

	if err := s.repo.CreateBatch(entries); err != nil {
		return err
	}

	// Update last watched on tracked show
	maxSeason := 0
	maxEpisode := 0
	for _, entry := range entries {
		if entry.SeasonNumber > maxSeason || (entry.SeasonNumber == maxSeason && entry.EpisodeNumber > maxEpisode) {
			maxSeason = entry.SeasonNumber
			maxEpisode = entry.EpisodeNumber
		}
	}
	if maxSeason > 0 {
		_ = s.alertRepo.UpdateLastWatched(userID, req.ShowID, maxSeason, maxEpisode)
	}

	return nil
}

func (s *Service) Update(ctx context.Context, userID uuid.UUID, id uuid.UUID, rating *int, notes *string) error {
	entry, err := s.repo.GetByID(userID, id)
	if err != nil {
		return errors.New("history entry not found")
	}
	if rating != nil {
		if *rating < 1 || *rating > 10 {
			return errors.New("rating must be 1-10")
		}
		entry.Rating = rating
	}
	if notes != nil {
		entry.Notes = notes
	}
	return s.repo.Update(entry)
}

func (s *Service) Delete(ctx context.Context, userID, id uuid.UUID) error {
	return s.repo.Delete(id, userID)
}

func (s *Service) Stats(ctx context.Context, userID uuid.UUID) (*Stats, error) {
	return s.repo.GetStats(userID)
}

func (s *Service) Progress(ctx context.Context, userID, showID uuid.UUID) (*Progress, error) {
	// total episodes
	total, err := s.showRepo.CountEpisodes(showID)
	if err != nil {
		return nil, err
	}
	// watched episodes
	entries, err := s.repo.ListByShow(userID, showID)
	if err != nil {
		return nil, err
	}
	progress := &Progress{
		TotalEpisodes:   total,
		WatchedEpisodes: len(entries),
	}
	if total > 0 {
		progress.PercentComplete = math.Round((float64(len(entries))/float64(total))*10000) / 100
	}

	// Find next episode: naive approach based on max season/episode watched
	maxSeason := 0
	maxEpisode := 0
	for _, e := range entries {
		if e.SeasonNumber > maxSeason || (e.SeasonNumber == maxSeason && e.EpisodeNumber > maxEpisode) {
			maxSeason = e.SeasonNumber
			maxEpisode = e.EpisodeNumber
		}
	}
	if maxSeason > 0 {
		// Next episode assumed to be current season+1 episode, unless episode list shows otherwise
		progress.NextEpisode = &struct {
			SeasonNumber  int `json:"season_number"`
			EpisodeNumber int `json:"episode_number"`
		}{
			SeasonNumber:  maxSeason,
			EpisodeNumber: maxEpisode + 1,
		}
	}
	if maxSeason == 0 && total > 0 {
		progress.NextEpisode = &struct {
			SeasonNumber  int `json:"season_number"`
			EpisodeNumber int `json:"episode_number"`
		}{
			SeasonNumber:  1,
			EpisodeNumber: 1,
		}
	}

	return progress, nil
}
