package showtimes

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/tashifkhan/bingebeacon/internal/pkg/context"
	"github.com/tashifkhan/bingebeacon/internal/pkg/httputil"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetShowtimes(w http.ResponseWriter, r *http.Request) {
	_, ok := context.UserID(r.Context())
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	vars := mux.Vars(r)
	showID, err := uuid.Parse(vars["show_id"])
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid show ID")
		return
	}

	lat := r.URL.Query().Get("lat")
	lng := r.URL.Query().Get("lng")
	if lat == "" || lng == "" {
		httputil.Error(w, http.StatusBadRequest, "lat and lng required")
		return
	}
	geolocation := lat + ";" + lng

	date := r.URL.Query().Get("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	result, err := h.svc.GetShowtimes(r.Context(), showID, date, geolocation)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, result)
}

func (h *Handler) GetCinemasNearby(w http.ResponseWriter, r *http.Request) {
	_, ok := context.UserID(r.Context())
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	lat := r.URL.Query().Get("lat")
	lng := r.URL.Query().Get("lng")
	if lat == "" || lng == "" {
		httputil.Error(w, http.StatusBadRequest, "lat and lng required")
		return
	}
	geolocation := lat + ";" + lng

	result, err := h.svc.GetCinemasNearby(r.Context(), geolocation)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, result)
}
