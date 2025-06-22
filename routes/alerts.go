package routes

import (
	"encoding/json"
	"net/http"
)

type Alert struct {
	UserID   string `json:"user_id"`
	ShowName string `json:"show_name"`
	Type     string `json:"type"` // e.g., new_episode, new_season
}

var alerts = []Alert{
	{UserID: "user1", ShowName: "Example Show", Type: "new_episode"},
}

func AlertsHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Integrate with DB to manage alerts
	switch r.Method {
	case http.MethodGet:
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(alerts)
	case http.MethodPost:
		var a Alert
		if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		alerts = append(alerts, a) // TODO: Save to DB
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(a)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
