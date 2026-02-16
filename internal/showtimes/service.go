package showtimes

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/tashifkhan/bingebeacon/internal/metadata/movieglu"
	"github.com/tashifkhan/bingebeacon/internal/pkg/cache"
	"github.com/tashifkhan/bingebeacon/internal/show"
)

type Service struct {
	movieGlu *movieglu.Client
	showRepo *show.Repository
	redis    *redis.Client
}

func NewService(client *movieglu.Client, showRepo *show.Repository, rdb *redis.Client) *Service {
	return &Service{movieGlu: client, showRepo: showRepo, redis: rdb}
}

type ShowtimesResponse struct {
	ShowID uuid.UUID               `json:"show_id"`
	IMDBID string                  `json:"imdb_id"`
	Date   string                  `json:"date"`
	Films  []movieglu.FilmShowtime `json:"films"`
}

func (s *Service) GetShowtimes(ctx context.Context, showID uuid.UUID, date string, geolocation string) (*ShowtimesResponse, error) {
	showRecord, err := s.showRepo.FindByID(showID)
	if err != nil {
		return nil, err
	}
	if showRecord.MediaType != "movie" {
		return nil, fmt.Errorf("showtimes only supported for movies")
	}
	if showRecord.IMDBID == nil {
		return nil, fmt.Errorf("imdb_id not found for show")
	}

	key := fmt.Sprintf("showtimes:%s:%s:%s", *showRecord.IMDBID, geolocation, date)
	return cache.GetOrSet(ctx, s.redis, key, 5*time.Minute, func() (*ShowtimesResponse, error) {
		// MovieGlu requires a film_id, so resolve via search
		search, err := s.movieGlu.FilmLiveSearch(ctx, showRecord.Title, geolocation)
		if err != nil {
			return nil, err
		}
		filmID := ""
		for _, film := range search.Films {
			if film.IMDBTitleID == *showRecord.IMDBID {
				filmID = film.FilmID
				break
			}
		}
		if filmID == "" && len(search.Films) > 0 {
			filmID = search.Films[0].FilmID
		}
		if filmID == "" {
			return nil, fmt.Errorf("movieglu film_id not found")
		}

		resp, err := s.movieGlu.FilmShowTimes(ctx, filmID, date, geolocation)
		if err != nil {
			return nil, err
		}
		return &ShowtimesResponse{
			ShowID: showID,
			IMDBID: *showRecord.IMDBID,
			Date:   date,
			Films:  resp.Films,
		}, nil
	})
}

func (s *Service) GetCinemasNearby(ctx context.Context, geolocation string) (*movieglu.CinemasNearbyResponse, error) {
	key := fmt.Sprintf("cinemas:%s", geolocation)
	return cache.GetOrSet(ctx, s.redis, key, 5*time.Minute, func() (*movieglu.CinemasNearbyResponse, error) {
		return s.movieGlu.CinemasNearby(ctx, geolocation)
	})
}
