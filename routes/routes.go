package routes

import (
	"net/http"

	"github.com/gorilla/mux"
)

func NewRouter() *mux.Router {
	r := mux.NewRouter()
	r.HandleFunc("/alerts", AlertsHandler).Methods("GET", "POST")
	r.HandleFunc("/timeline", TimelineHandler).Methods("GET")
	r.HandleFunc("/shows", ShowsHandler).Methods("GET")
	r.HandleFunc("/notifications", NotificationsHandler).Methods("POST")
	r.HandleFunc("/users", UsersHandler).Methods("GET", "POST")
	return r
}

func AlertsHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Integrate with DB to manage alerts
	w.Write([]byte("Alerts endpoint - DB integration pending"))
}

func TimelineHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Integrate with DB to fetch timeline
	w.Write([]byte("Timeline endpoint - DB integration pending"))
}

func ShowsHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Integrate with OMDB/TMDB APIs and DB for show info
	w.Write([]byte("Shows endpoint - OMDB/TMDB integration pending"))
}

func NotificationsHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Integrate with push notification service and DB
	w.Write([]byte("Notifications endpoint - Push/DB integration pending"))
}

func UsersHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Integrate with DB for user management
	w.Write([]byte("Users endpoint - DB integration pending"))
}
