package timeline

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/tashifkhan/bingebeacon/internal/pkg/cache"
	"gorm.io/datatypes"
)

type Service struct {
	repo  *Repository
	redis *redis.Client
}

func NewService(repo *Repository, rdb *redis.Client) *Service {
	return &Service{
		repo:  repo,
		redis: rdb,
	}
}

type TimelineEventResponse struct {
	ID            uuid.UUID      `json:"id"`
	ShowID        uuid.UUID      `json:"show_id"`
	ShowTitle     string         `json:"show_title"`
	EventType     string         `json:"event_type"`
	Title         string         `json:"title"`
	Description   string         `json:"description"`
	EventDate     time.Time      `json:"event_date"`
	SeasonNumber  *int           `json:"season_number,omitempty"`
	EpisodeNumber *int           `json:"episode_number,omitempty"`
	Metadata      datatypes.JSON `json:"metadata,omitempty"`
}

func (s *Service) GetTimeline(ctx context.Context, userID uuid.UUID, from, to time.Time, eventType string) ([]TimelineEventResponse, error) {
	key := fmt.Sprintf("timeline:%s:range:%s:%s:%s", userID, from.Format("2006-01-02"), to.Format("2006-01-02"), eventType)
	return cache.GetOrSet(ctx, s.redis, key, 2*time.Minute, func() ([]TimelineEventResponse, error) {
		events, err := s.repo.GetUserTimeline(userID, from, to, eventType)
		if err != nil {
			return nil, err
		}
		return s.mapEvents(events), nil
	})
}

func (s *Service) GetToday(ctx context.Context, userID uuid.UUID) ([]TimelineEventResponse, error) {
	key := fmt.Sprintf("timeline:%s:today", userID)
	return cache.GetOrSet(ctx, s.redis, key, 2*time.Minute, func() ([]TimelineEventResponse, error) {
		events, err := s.repo.GetTodayEvents(userID, "UTC")
		if err != nil {
			return nil, err
		}
		return s.mapEvents(events), nil
	})
}

func (s *Service) GetThisWeek(ctx context.Context, userID uuid.UUID) ([]TimelineEventResponse, error) {
	key := fmt.Sprintf("timeline:%s:week", userID)
	return cache.GetOrSet(ctx, s.redis, key, 2*time.Minute, func() ([]TimelineEventResponse, error) {
		events, err := s.repo.GetWeekEvents(userID, "UTC")
		if err != nil {
			return nil, err
		}
		return s.mapEvents(events), nil
	})
}

func (s *Service) GetUpcoming(ctx context.Context, userID uuid.UUID) ([]TimelineEventResponse, error) {
	key := fmt.Sprintf("timeline:%s:upcoming", userID)
	return cache.GetOrSet(ctx, s.redis, key, 2*time.Minute, func() ([]TimelineEventResponse, error) {
		events, err := s.repo.GetUpcomingEvents(userID, 30)
		if err != nil {
			return nil, err
		}
		return s.mapEvents(events), nil
	})
}

func (s *Service) mapEvents(events []TimelineEvent) []TimelineEventResponse {
	resp := make([]TimelineEventResponse, len(events))
	for i, e := range events {
		desc := ""
		if e.Description != nil {
			desc = *e.Description
		}

		// Fill show title if not present in event title but show is loaded
		// Note: Event title usually contains episode title. Show title is in e.Show.Title

		resp[i] = TimelineEventResponse{
			ID:            e.ID,
			ShowID:        e.ShowID,
			ShowTitle:     e.Show.Title,
			EventType:     e.EventType,
			Title:         e.Title,
			Description:   desc,
			EventDate:     e.EventDate,
			SeasonNumber:  e.SeasonNumber,
			EpisodeNumber: e.EpisodeNumber,
			Metadata:      e.Metadata,
		}
	}
	return resp
}
