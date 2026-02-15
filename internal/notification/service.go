package notification

import (
	"context"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
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

func (s *Service) GetNotifications(ctx context.Context, userID uuid.UUID, status string, page int) (*PaginatedNotifications, error) {
	limit := 20
	notifs, total, err := s.repo.GetByUser(userID, status, page, limit)
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
	return s.repo.MarkRead(notifID, userID)
}

func (s *Service) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	return s.repo.MarkAllRead(userID)
}

func (s *Service) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	// TODO: Add caching layer for badge count
	return s.repo.GetUnreadCount(userID)
}
