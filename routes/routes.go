package routes

import (
	"encoding/json"
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

func ShowsHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Integrate with OMDB/TMDB APIs and DB for show info
	q := r.URL.Query().Get("q")
	source := r.URL.Query().Get("source")
	if q == "" {
		http.Error(w, "Missing query parameter 'q'", http.StatusBadRequest)
		return
	}
	var result *ShowResult
	var err error
	switch source {
	case "tmdb":
		result, err = fetchFromTMDB(q)
	default:
		result, err = fetchFromOMDB(q)
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func NotificationsHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Integrate with push notification service and DB
	w.Write([]byte("Notifications endpoint - Push/DB integration pending"))
}

func UsersHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Integrate with DB for user management
	w.Write([]byte("Users endpoint - DB integration pending"))
}
