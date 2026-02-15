package alert

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/tashifkhan/bingebeacon/internal/show"
)

type ShowSyncer interface {
	SyncShow(ctx context.Context, showID uuid.UUID) error
}

type Service struct {
	repo     *Repository
	showSvc  *show.Service
	showRepo *show.Repository
	syncer   ShowSyncer
}

func NewService(repo *Repository, showSvc *show.Service, showRepo *show.Repository, syncer ShowSyncer) *Service {
	return &Service{
		repo:     repo,
		showSvc:  showSvc,
		showRepo: showRepo,
		syncer:   syncer,
	}
}

type TrackRequest struct {
	ShowID             *uuid.UUID `json:"show_id"`
	TMDBID             *int       `json:"tmdb_id"`
	IsFavorite         *bool      `json:"is_favorite"`
	NotifyNewEpisode   *bool      `json:"notify_new_episode"`
	NotifyNewSeason    *bool      `json:"notify_new_season"`
	NotifyStatusChange *bool      `json:"notify_status_change"`
	NotifyHoursBefore  *int       `json:"notify_hours_before"`
}

type UpdateTrackRequest struct {
	IsFavorite         *bool `json:"is_favorite"`
	NotifyNewEpisode   *bool `json:"notify_new_episode"`
	NotifyNewSeason    *bool `json:"notify_new_season"`
	NotifyStatusChange *bool `json:"notify_status_change"`
	NotifyHoursBefore  *int  `json:"notify_hours_before"`
}

type TrackedShowResponse struct {
	ShowID             uuid.UUID `json:"show_id"`
	ShowTitle          string    `json:"show_title"`
	PosterURL          string    `json:"poster_url"`
	IsFavorite         bool      `json:"is_favorite"`
	NotifyNewEpisode   bool      `json:"notify_new_episode"`
	NotifyNewSeason    bool      `json:"notify_new_season"`
	NotifyStatusChange bool      `json:"notify_status_change"`
	NotifyHoursBefore  int       `json:"notify_hours_before"`
	LastWatchedSeason  *int      `json:"last_watched_season,omitempty"`
	LastWatchedEpisode *int      `json:"last_watched_episode,omitempty"`
	Status             string    `json:"status"`
	NextEpisodeDate    string    `json:"next_episode_date,omitempty"` // For UI
}

func (s *Service) TrackShow(ctx context.Context, userID uuid.UUID, req TrackRequest) error {
	var showID uuid.UUID

	if req.ShowID != nil {
		// Check if exists
		if _, err := s.showRepo.FindByID(*req.ShowID); err != nil {
			return errors.New("show not found")
		}
		showID = *req.ShowID
	} else if req.TMDBID != nil {
		// Get or Create
		show, err := s.showSvc.GetOrCreateByTMDBID(ctx, *req.TMDBID)
		if err != nil {
			return err
		}
		showID = show.ID
	} else {
		return errors.New("show_id or tmdb_id required")
	}

	// Check if already tracked
	if _, err := s.repo.FindByUserAndShow(userID, showID); err == nil {
		return errors.New("show already tracked")
	}

	track := &UserTrackedShow{
		UserID:             userID,
		ShowID:             showID,
		IsFavorite:         DefaultBool(req.IsFavorite, false),
		NotifyNewEpisode:   DefaultBool(req.NotifyNewEpisode, true),
		NotifyNewSeason:    DefaultBool(req.NotifyNewSeason, true),
		NotifyStatusChange: DefaultBool(req.NotifyStatusChange, true),
		NotifyHoursBefore:  DefaultInt(req.NotifyHoursBefore, 0),
	}

	if err := s.repo.Create(track); err != nil {
		return err
	}

	// Trigger Sync asynchronously to not block response
	go func() {
		// Create a new context for background work
		bgCtx := context.Background()
		s.syncer.SyncShow(bgCtx, showID)
	}()

	return nil
}

func (s *Service) UntrackShow(ctx context.Context, userID, showID uuid.UUID) error {
	return s.repo.Delete(userID, showID)
}

func (s *Service) UpdateTracking(ctx context.Context, userID, showID uuid.UUID, req UpdateTrackRequest) error {
	track, err := s.repo.FindByUserAndShow(userID, showID)
	if err != nil {
		return errors.New("tracked show not found")
	}

	if req.IsFavorite != nil {
		track.IsFavorite = *req.IsFavorite
	}
	if req.NotifyNewEpisode != nil {
		track.NotifyNewEpisode = *req.NotifyNewEpisode
	}
	if req.NotifyNewSeason != nil {
		track.NotifyNewSeason = *req.NotifyNewSeason
	}
	if req.NotifyStatusChange != nil {
		track.NotifyStatusChange = *req.NotifyStatusChange
	}
	if req.NotifyHoursBefore != nil {
		track.NotifyHoursBefore = *req.NotifyHoursBefore
	}
	track.UpdatedAt = time.Now()

	return s.repo.Update(track)
}

func (s *Service) GetTrackedShows(ctx context.Context, userID uuid.UUID) ([]TrackedShowResponse, error) {
	tracks, err := s.repo.GetAllByUser(userID)
	if err != nil {
		return nil, err
	}
	return s.mapTracks(tracks), nil
}

func (s *Service) GetFavorites(ctx context.Context, userID uuid.UUID) ([]TrackedShowResponse, error) {
	tracks, err := s.repo.GetFavorites(userID)
	if err != nil {
		return nil, err
	}
	return s.mapTracks(tracks), nil
}

func (s *Service) ToggleFavorite(ctx context.Context, userID, showID uuid.UUID) error {
	track, err := s.repo.FindByUserAndShow(userID, showID)
	if err != nil {
		return errors.New("tracked show not found")
	}
	track.IsFavorite = !track.IsFavorite
	track.UpdatedAt = time.Now()
	return s.repo.Update(track)
}

func (s *Service) mapTracks(tracks []UserTrackedShow) []TrackedShowResponse {
	resp := make([]TrackedShowResponse, len(tracks))
	for i, t := range tracks {
		resp[i] = TrackedShowResponse{
			ShowID:             t.ShowID,
			ShowTitle:          t.Show.Title,
			PosterURL:          SafeString(t.Show.PosterURL),
			IsFavorite:         t.IsFavorite,
			NotifyNewEpisode:   t.NotifyNewEpisode,
			NotifyNewSeason:    t.NotifyNewSeason,
			NotifyStatusChange: t.NotifyStatusChange,
			NotifyHoursBefore:  t.NotifyHoursBefore,
			LastWatchedSeason:  t.LastWatchedSeason,
			LastWatchedEpisode: t.LastWatchedEpisode,
			Status:             SafeString(t.Show.Status),
		}
	}
	return resp
}

func DefaultBool(ptr *bool, def bool) bool {
	if ptr == nil {
		return def
	}
	return *ptr
}

func DefaultInt(ptr *int, def int) int {
	if ptr == nil {
		return def
	}
	return *ptr
}

func SafeString(ptr *string) string {
	if ptr == nil {
		return ""
	}
	return *ptr
}
