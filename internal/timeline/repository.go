package timeline

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(event *TimelineEvent) error {
	return r.db.Create(event).Error
}

func (r *Repository) FindByShowAndEpisode(showID, episodeID uuid.UUID) (*TimelineEvent, error) {
	var event TimelineEvent
	if err := r.db.Where("show_id = ? AND episode_id = ?", showID, episodeID).First(&event).Error; err != nil {
		return nil, err
	}
	return &event, nil
}

func (r *Repository) GetUserTimeline(userID uuid.UUID, from, to time.Time, eventType string) ([]TimelineEvent, error) {
	var events []TimelineEvent

	query := r.db.Table("timeline_events").
		Select("timeline_events.*").
		Joins("INNER JOIN user_tracked_shows uts ON uts.show_id = timeline_events.show_id").
		Where("uts.user_id = ?", userID).
		Where("timeline_events.event_date BETWEEN ? AND ?", from, to).
		Preload("Show")

	if eventType != "" {
		query = query.Where("timeline_events.event_type = ?", eventType)
	}

	query = query.Order("timeline_events.event_date ASC")

	if err := query.Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}

func (r *Repository) GetTodayEvents(userID uuid.UUID, tz string) ([]TimelineEvent, error) {
	// Simple implementation assuming UTC for now, proper TZ handling requires loc
	now := time.Now().UTC()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	endOfDay := startOfDay.Add(24 * time.Hour)
	return r.GetUserTimeline(userID, startOfDay, endOfDay, "")
}

func (r *Repository) GetWeekEvents(userID uuid.UUID, tz string) ([]TimelineEvent, error) {
	now := time.Now().UTC()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	endOfWeek := startOfDay.Add(7 * 24 * time.Hour)
	return r.GetUserTimeline(userID, startOfDay, endOfWeek, "")
}

func (r *Repository) GetUpcomingEvents(userID uuid.UUID, days int) ([]TimelineEvent, error) {
	now := time.Now().UTC()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	end := start.Add(time.Duration(days) * 24 * time.Hour)
	return r.GetUserTimeline(userID, start, end, "")
}
