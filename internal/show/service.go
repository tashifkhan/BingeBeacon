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
	ID        *uuid.UUID `json:"id,omitempty"`
	TMDBID    int        `json:"tmdb_id"`
	Title     string     `json:"title"`
	Overview  string     `json:"overview"`
	PosterURL string     `json:"poster_url"`
	MediaType string     `json:"media_type"`
	Year      string     `json:"year"`
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
					ID:        &show.ID,
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

					dateStr := item.FirstAirDate
					if item.MediaType == "movie" {
						dateStr = item.ReleaseDate
					}

					stored := showFromSearchResult(item)
					if err := s.repo.UpsertSearchResult(stored); err != nil {
						continue
					}
					results = append(results, mapSearchResult(stored, dateStr))
				}
			}
		}
		return results, nil
	})
}

func (s *Service) GetTrending(ctx context.Context, mediaType, timeWindow string) ([]ShowResult, error) {
	if mediaType == "" {
		mediaType = "all"
	}
	if mediaType != "all" && mediaType != "tv" && mediaType != "movie" {
		return nil, fmt.Errorf("type must be all, tv, or movie")
	}
	if timeWindow == "" {
		timeWindow = "day"
	}
	if timeWindow != "day" && timeWindow != "week" {
		return nil, fmt.Errorf("window must be day or week")
	}
	key := fmt.Sprintf("trending:%s:%s", mediaType, timeWindow)
	return cache.GetOrSet(ctx, s.redis, key, time.Hour, func() ([]ShowResult, error) {
		response, err := s.tmdbClient.GetTrending(ctx, mediaType, timeWindow)
		if err != nil {
			return nil, err
		}
		return s.persistDiscoveryResults(response.Results)
	})
}

func (s *Service) GetPopular(ctx context.Context, mediaType string, page int) ([]ShowResult, error) {
	if mediaType == "" {
		mediaType = "tv"
	}
	if mediaType != "tv" && mediaType != "movie" {
		return nil, fmt.Errorf("type must be tv or movie")
	}
	if page <= 0 {
		page = 1
	}
	key := fmt.Sprintf("popular:%s:%d", mediaType, page)
	return cache.GetOrSet(ctx, s.redis, key, time.Hour, func() ([]ShowResult, error) {
		response, err := s.tmdbClient.GetPopular(ctx, mediaType, page)
		if err != nil {
			return nil, err
		}
		return s.persistDiscoveryResults(response.Results)
	})
}

func (s *Service) persistDiscoveryResults(items []tmdb.SearchResult) ([]ShowResult, error) {
	results := make([]ShowResult, 0, len(items))
	for _, item := range items {
		if item.MediaType == "" {
			// TMDB's media-specific popular endpoints omit media_type.
			if item.Name != "" {
				item.MediaType = "tv"
			} else {
				item.MediaType = "movie"
			}
		}
		if item.MediaType != "tv" && item.MediaType != "movie" {
			continue
		}
		stored := showFromSearchResult(item)
		if err := s.repo.UpsertSearchResult(stored); err != nil {
			return nil, err
		}
		date := item.FirstAirDate
		if item.MediaType == "movie" {
			date = item.ReleaseDate
		}
		results = append(results, mapSearchResult(stored, date))
	}
	return results, nil
}

func showFromSearchResult(item tmdb.SearchResult) *Show {
	title := item.Name
	date := item.FirstAirDate
	if item.MediaType == "movie" {
		title = item.Title
		date = item.ReleaseDate
	}
	overview := item.Overview
	poster := item.PosterPath
	backdrop := item.BackdropPath
	return &Show{
		Title: title, MediaType: item.MediaType, TMDBID: &item.ID,
		Overview: &overview, PosterURL: &poster, BackdropURL: &backdrop,
		PremiereDate: parseTMDBDate(date),
	}
}

func mapSearchResult(item *Show, date string) ShowResult {
	return ShowResult{
		ID: &item.ID, TMDBID: *item.TMDBID, Title: item.Title,
		Overview: SafeString(item.Overview), PosterURL: SafeString(item.PosterURL),
		MediaType: item.MediaType, Year: ExtractYearString(date),
	}
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
	key := fmt.Sprintf("season:%s:%d", showID, seasonNum)
	return cache.GetOrSet(ctx, s.redis, key, 15*time.Minute, func() (*Season, error) {
		return s.repo.GetSeasonWithEpisodes(showID, seasonNum)
	})
}

func (s *Service) GetEpisodes(ctx context.Context, showID uuid.UUID, upcoming bool) ([]Episode, error) {
	key := fmt.Sprintf("episodes:%s:%v", showID, upcoming)
	return cache.GetOrSet(ctx, s.redis, key, 15*time.Minute, func() ([]Episode, error) {
		return s.repo.GetEpisodes(showID, upcoming)
	})
}

func (s *Service) GetOrCreateByTMDBID(ctx context.Context, tmdbID int, mediaType string) (*Show, error) {
	if mediaType == "" {
		mediaType = "tv"
	}
	if mediaType != "tv" && mediaType != "movie" {
		return nil, fmt.Errorf("unsupported media type %q", mediaType)
	}

	// Check if exists
	show, err := s.repo.FindByTMDBID(tmdbID)
	if err == nil {
		if show.MediaType != mediaType {
			return nil, fmt.Errorf("TMDB ID %d is already stored as %s", tmdbID, show.MediaType)
		}
		return show, nil
	}

	newShow := &Show{MediaType: mediaType, SyncPriority: 1}
	if mediaType == "movie" {
		movie, fetchErr := s.tmdbClient.GetMovie(ctx, tmdbID)
		if fetchErr != nil {
			return nil, fetchErr
		}
		newShow.TMDBID = &movie.ID
		newShow.Title = movie.Title
		newShow.Overview = &movie.Overview
		newShow.PosterURL = &movie.PosterPath
		newShow.BackdropURL = &movie.BackdropPath
		newShow.Status = &movie.Status
		newShow.PremiereDate = parseTMDBDate(movie.ReleaseDate)
		for _, genre := range movie.Genres {
			newShow.Genres = append(newShow.Genres, genre.Name)
		}
	} else {
		tvShow, fetchErr := s.tmdbClient.GetTVShow(ctx, tmdbID)
		if fetchErr != nil {
			return nil, fetchErr
		}
		newShow.TMDBID = &tvShow.ID
		newShow.Title = tvShow.Name
		newShow.Overview = &tvShow.Overview
		newShow.PosterURL = &tvShow.PosterPath
		newShow.BackdropURL = &tvShow.BackdropPath
		newShow.Status = &tvShow.Status
		newShow.PremiereDate = parseTMDBDate(tvShow.FirstAirDate)
		for _, genre := range tvShow.Genres {
			newShow.Genres = append(newShow.Genres, genre.Name)
		}
	}

	if err := s.repo.UpsertFromTMDB(newShow); err != nil {
		return nil, err
	}

	// Retrieve to get the generated UUID
	return s.repo.FindByTMDBID(tmdbID)
}

func parseTMDBDate(value string) *time.Time {
	if value == "" {
		return nil
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return nil
	}
	return &parsed
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

func ExtractYearString(value string) string {
	if len(value) >= 4 {
		return value[:4]
	}
	return value
}
