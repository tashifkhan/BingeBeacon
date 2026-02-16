package streaming

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/tashifkhan/bingebeacon/internal/metadata/tmdb"
	"github.com/tashifkhan/bingebeacon/internal/pkg/cache"
	"github.com/tashifkhan/bingebeacon/internal/show"
)

type Service struct {
	showRepo   *show.Repository
	tmdbClient *tmdb.Client
	redis      *redis.Client
}

func NewService(showRepo *show.Repository, tmdbClient *tmdb.Client, rdb *redis.Client) *Service {
	return &Service{showRepo: showRepo, tmdbClient: tmdbClient, redis: rdb}
}

type StreamingResponse struct {
	ShowID   uuid.UUID            `json:"show_id"`
	Region   string               `json:"region"`
	Link     string               `json:"link"`
	Flatrate []tmdb.WatchProvider `json:"flatrate"`
	Rent     []tmdb.WatchProvider `json:"rent"`
	Buy      []tmdb.WatchProvider `json:"buy"`
}

func (s *Service) GetStreaming(ctx context.Context, showID uuid.UUID, region string) (*StreamingResponse, error) {
	if region == "" {
		region = "IN"
	}
	region = strings.ToUpper(region)

	showRecord, err := s.showRepo.FindByID(showID)
	if err != nil {
		return nil, err
	}
	if showRecord.TMDBID == nil {
		return nil, errors.New("tmdb_id not found for show")
	}
	mediaType := showRecord.MediaType
	if mediaType != "movie" && mediaType != "tv" {
		return nil, fmt.Errorf("invalid media_type")
	}

	key := fmt.Sprintf("streaming:%s:%s", showRecord.ID, region)
	return cache.GetOrSet(ctx, s.redis, key, 12*time.Hour, func() (*StreamingResponse, error) {
		resp, err := s.tmdbClient.GetWatchProviders(ctx, mediaType, *showRecord.TMDBID)
		if err != nil {
			return nil, err
		}
		regionData, ok := resp.Results[region]
		if !ok {
			return &StreamingResponse{ShowID: showID, Region: region}, nil
		}
		return &StreamingResponse{
			ShowID:   showID,
			Region:   region,
			Link:     regionData.Link,
			Flatrate: regionData.Flatrate,
			Rent:     regionData.Rent,
			Buy:      regionData.Buy,
		}, nil
	})
}
