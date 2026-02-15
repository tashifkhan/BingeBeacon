package timeline

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
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
	events, err := s.repo.GetUserTimeline(userID, from, to, eventType)
	if err != nil {
		return nil, err
	}
	return s.mapEvents(events), nil
}

func (s *Service) GetToday(ctx context.Context, userID uuid.UUID) ([]TimelineEventResponse, error) {
	events, err := s.repo.GetTodayEvents(userID, "UTC")
	if err != nil {
		return nil, err
	}
	return s.mapEvents(events), nil
}

func (s *Service) GetThisWeek(ctx context.Context, userID uuid.UUID) ([]TimelineEventResponse, error) {
	events, err := s.repo.GetWeekEvents(userID, "UTC")
	if err != nil {
		return nil, err
	}
	return s.mapEvents(events), nil
}

func (s *Service) GetUpcoming(ctx context.Context, userID uuid.UUID) ([]TimelineEventResponse, error) {
	events, err := s.repo.GetUpcomingEvents(userID, 30)
	if err != nil {
		return nil, err
	}
	return s.mapEvents(events), nil
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
