package routes

import (
	"encoding/json"
	"net/http"
)

type Notification struct {
	UserID  string `json:"user_id"`
	Message string `json:"message"`
}

var notifications = []Notification{}

func NotificationsHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Integrate with real push notification service
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var n Notification
	if err := json.NewDecoder(r.Body).Decode(&n); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	notifications = append(notifications, n)
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "Notification queued (stub)"})
}
