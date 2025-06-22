package routes

import (
	"encoding/json"
	"net/http"
)

type TimelineEvent struct {
	ShowTitle string `json:"show_title"`
	Episode   string `json:"episode"`
	AirDate   string `json:"air_date"`
}

func getUpcomingTimeline() []TimelineEvent {
	// TODO: Fetch from DB and/or external APIs
	return []TimelineEvent{
		{ShowTitle: "Example Show", Episode: "S02E01", AirDate: "2025-07-01"},
		{ShowTitle: "Another Show", Episode: "S01E10", AirDate: "2025-07-03"},
	}
}

func TimelineHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Integrate with DB for timeline
	events := getUpcomingTimeline()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}
