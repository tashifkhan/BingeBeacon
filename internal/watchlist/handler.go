package watchlist

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

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := context.UserID(r.Context())
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	items, err := h.svc.List(userID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) Add(w http.ResponseWriter, r *http.Request) {
	userID, ok := context.UserID(r.Context())
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	var req AddRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.svc.Add(r.Context(), userID, req); err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{"message": "Added to watchlist"})
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
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

	var req UpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.svc.Update(r.Context(), userID, showID, req); err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"message": "Watchlist updated"})
}

func (h *Handler) Remove(w http.ResponseWriter, r *http.Request) {
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

	if err := h.svc.Remove(r.Context(), userID, showID); err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) StartTracking(w http.ResponseWriter, r *http.Request) {
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

	if err := h.svc.StartTracking(r.Context(), userID, showID); err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"message": "Tracking started"})
}
