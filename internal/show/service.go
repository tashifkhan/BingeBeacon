package show

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/tashifkhan/bingebeacon/internal/metadata/tmdb"
	"github.com/tashifkhan/bingebeacon/internal/pkg/cache"
)

type Service struct {
	repo       *Repository
	tmdbClient *tmdb.Client
	redis      *redis.Client
}

func NewService(repo *Repository, tmdbClient *tmdb.Client, rdb *redis.Client) *Service {
	return &Service{
		repo:       repo,
		tmdbClient: tmdbClient,
		redis:      rdb,
	}
}

type ShowResult struct {
	ID        uuid.UUID `json:"id"`
	TMDBID    int       `json:"tmdb_id"`
	Title     string    `json:"title"`
	Overview  string    `json:"overview"`
	PosterURL string    `json:"poster_url"`
	MediaType string    `json:"media_type"`
	Year      string    `json:"year"`
}

func (s *Service) Search(ctx context.Context, query string, mediaType string) ([]ShowResult, error) {
	// Cache key
	key := fmt.Sprintf("search:%s:%s", query, mediaType)

	return cache.GetOrSet(ctx, s.redis, key, 1*time.Hour, func() ([]ShowResult, error) {
		// 1. Search local DB
		localShows, err := s.repo.Search(query, mediaType, 10)
		if err != nil {
			// Log error but continue to TMDB
		}

		results := make([]ShowResult, 0)
		seenTMDBIDs := make(map[int]bool)

		for _, show := range localShows {
			if show.TMDBID != nil {
				seenTMDBIDs[*show.TMDBID] = true
				results = append(results, ShowResult{
					ID:        show.ID,
					TMDBID:    *show.TMDBID,
					Title:     show.Title,
					Overview:  SafeString(show.Overview),
					PosterURL: SafeString(show.PosterURL),
					MediaType: show.MediaType,
					Year:      ExtractYear(show.PremiereDate),
				})
			}
		}

		// 2. If few results, search TMDB
		if len(results) < 5 {
			tmdbResp, err := s.tmdbClient.SearchMulti(ctx, query, 1)
			if err == nil && tmdbResp != nil {
				for _, item := range tmdbResp.Results {
					if item.MediaType != "tv" && item.MediaType != "movie" {
						continue
					}
					if mediaType != "" && item.MediaType != mediaType {
						continue
					}

					if seenTMDBIDs[item.ID] {
						continue
					}

					title := item.Name
					if item.MediaType == "movie" {
						title = item.Title
					}

					dateStr := item.FirstAirDate
					if item.MediaType == "movie" {
						dateStr = item.ReleaseDate
					}

					results = append(results, ShowResult{
						TMDBID:    item.ID,
						Title:     title,
						Overview:  item.Overview,
						PosterURL: "https://image.tmdb.org/t/p/w500" + item.PosterPath,
						MediaType: item.MediaType,
						Year:      dateStr,
					})
				}
			}
		}
		return results, nil
	})
}

func (s *Service) GetShow(ctx context.Context, id uuid.UUID) (*Show, error) {
	// Cache key: show:{id}
	// Note: Show struct has nested slices (Seasons) which might need careful JSON handling
	// but standard encoding/json should work fine.
	key := fmt.Sprintf("show:%s", id.String())
	return cache.GetOrSet(ctx, s.redis, key, 15*time.Minute, func() (*Show, error) {
		return s.repo.GetWithSeasons(id)
	})
}

// ... other methods unchanged ...

func (s *Service) GetSeason(ctx context.Context, showID uuid.UUID, seasonNum int) (*Season, error) {
	return s.repo.GetSeasonWithEpisodes(showID, seasonNum)
}

func (s *Service) GetEpisodes(ctx context.Context, showID uuid.UUID, upcoming bool) ([]Episode, error) {
	return s.repo.GetEpisodes(showID, upcoming)
}

func (s *Service) GetOrCreateByTMDBID(ctx context.Context, tmdbID int) (*Show, error) {
	// Check if exists
	show, err := s.repo.FindByTMDBID(tmdbID)
	if err == nil {
		return show, nil
	}

	// Fetch from TMDB
	tmdbShow, err := s.tmdbClient.GetTVShow(ctx, tmdbID)
	if err != nil {
		return nil, err
	}

	// Create Show struct
	// This is a minimal creation. Full sync happens in Syncer.
	// But we need enough to display basic info.

	newShow := &Show{
		TMDBID:       &tmdbShow.ID,
		Title:        tmdbShow.Name,
		Overview:     &tmdbShow.Overview,
		PosterURL:    &tmdbShow.PosterPath,
		BackdropURL:  &tmdbShow.BackdropPath,
		MediaType:    "tv", // Assuming TV for now
		Status:       &tmdbShow.Status,
		SyncPriority: 1, // High priority for initial sync
	}

	if tmdbShow.FirstAirDate != "" {
		date, err := time.Parse("2006-01-02", tmdbShow.FirstAirDate)
		if err == nil {
			newShow.PremiereDate = &date
		}
	}

	if err := s.repo.UpsertFromTMDB(newShow); err != nil {
		return nil, err
	}

	// Retrieve to get the generated UUID
	return s.repo.FindByTMDBID(tmdbID)
}

// Helpers
func SafeString(ptr *string) string {
	if ptr == nil {
		return ""
	}
	return *ptr
}

func ExtractYear(date *time.Time) string {
	if date == nil {
		return ""
	}
	return date.Format("2006")
}
