package notification

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/tashifkhan/bingebeacon/internal/pkg/cache"
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

type PaginatedNotifications struct {
	Data  []NotificationResponse `json:"data"`
	Total int64                  `json:"total"`
	Page  int                    `json:"page"`
	Limit int                    `json:"limit"`
}

type NotificationResponse struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Status    string    `json:"status"`
	CreatedAt string    `json:"created_at"`
	ReadAt    *string   `json:"read_at,omitempty"`
}

func (s *Service) GetNotifications(ctx context.Context, userID uuid.UUID, status string, notifType string, from, to *time.Time, page, limit int) (*PaginatedNotifications, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}

	notifs, total, err := s.repo.GetByUser(userID, status, notifType, from, to, page, limit)
	if err != nil {
		return nil, err
	}

	resp := make([]NotificationResponse, len(notifs))
	for i, n := range notifs {
		var readAt *string
		if n.ReadAt != nil {
			t := n.ReadAt.Format("2006-01-02T15:04:05Z")
			readAt = &t
		}

		resp[i] = NotificationResponse{
			ID:        n.ID,
			Title:     n.Title,
			Body:      n.Body,
			Status:    n.Status,
			CreatedAt: n.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ReadAt:    readAt,
		}
	}

	return &PaginatedNotifications{
		Data:  resp,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

func (s *Service) MarkRead(ctx context.Context, userID, notifID uuid.UUID) error {
	if err := s.repo.MarkRead(notifID, userID); err != nil {
		return err
	}
	// Invalidate unread count
	s.redis.Del(ctx, fmt.Sprintf("notif:unread:%s", userID))
	return nil
}

func (s *Service) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	if err := s.repo.MarkAllRead(userID); err != nil {
		return err
	}
	// Invalidate unread count
	s.redis.Del(ctx, fmt.Sprintf("notif:unread:%s", userID))
	return nil
}

func (s *Service) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	key := fmt.Sprintf("notif:unread:%s", userID)
	return cache.GetOrSet(ctx, s.redis, key, 30*time.Second, func() (int64, error) {
		return s.repo.GetUnreadCount(userID)
	})
}
