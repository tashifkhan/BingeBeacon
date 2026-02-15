package alert

import (
	"encoding/json"
	"net/http"

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

func (h *Handler) TrackShow(w http.ResponseWriter, r *http.Request) {
	userID, ok := context.UserID(r.Context())
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	var req TrackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.svc.TrackShow(r.Context(), userID, req); err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{"message": "Show tracked"})
}

func (h *Handler) UntrackShow(w http.ResponseWriter, r *http.Request) {
	userID, ok := context.UserID(r.Context())
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	vars := mux.Vars(r)
	showIDStr := vars["show_id"]
	showID, err := uuid.Parse(showIDStr)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid show ID")
		return
	}

	if err := h.svc.UntrackShow(r.Context(), userID, showID); err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetTrackedShows(w http.ResponseWriter, r *http.Request) {
	userID, ok := context.UserID(r.Context())
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	shows, err := h.svc.GetTrackedShows(r.Context(), userID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, shows)
}

func (h *Handler) GetFavorites(w http.ResponseWriter, r *http.Request) {
	userID, ok := context.UserID(r.Context())
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	shows, err := h.svc.GetFavorites(r.Context(), userID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, shows)
}

func (h *Handler) ToggleFavorite(w http.ResponseWriter, r *http.Request) {
	userID, ok := context.UserID(r.Context())
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	vars := mux.Vars(r)
	showIDStr := vars["show_id"]
	showID, err := uuid.Parse(showIDStr)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid show ID")
		return
	}

	if err := h.svc.ToggleFavorite(r.Context(), userID, showID); err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"message": "Favorite toggled"})
}

func (h *Handler) UpdateTracking(w http.ResponseWriter, r *http.Request) {
	userID, ok := context.UserID(r.Context())
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	vars := mux.Vars(r)
	showIDStr := vars["show_id"]
	showID, err := uuid.Parse(showIDStr)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid show ID")
		return
	}

	var req UpdateTrackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.svc.UpdateTracking(r.Context(), userID, showID, req); err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"message": "Tracking updated"})
}
