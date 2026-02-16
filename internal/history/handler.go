package history

import (
	"encoding/json"
	"net/http"
	"strconv"

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

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 {
			limit = val
		}
	}

	var showID *uuid.UUID
	if showIDStr := r.URL.Query().Get("show_id"); showIDStr != "" {
		id, err := uuid.Parse(showIDStr)
		if err != nil {
			httputil.Error(w, http.StatusBadRequest, "Invalid show ID")
			return
		}
		showID = &id
	}

	entries, err := h.svc.List(userID, showID, limit)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, entries)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := context.UserID(r.Context())
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	var req CreateEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.svc.Create(r.Context(), userID, req); err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{"message": "History entry created"})
}

func (h *Handler) CreateBatch(w http.ResponseWriter, r *http.Request) {
	userID, ok := context.UserID(r.Context())
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	var req BatchCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.svc.CreateBatch(r.Context(), userID, req); err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{"message": "History entries created"})
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := context.UserID(r.Context())
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid history ID")
		return
	}

	var req UpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.svc.Update(r.Context(), userID, id, req.Rating, req.Notes); err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"message": "History entry updated"})
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := context.UserID(r.Context())
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid history ID")
		return
	}

	if err := h.svc.Delete(r.Context(), userID, id); err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Stats(w http.ResponseWriter, r *http.Request) {
	userID, ok := context.UserID(r.Context())
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	stats, err := h.svc.Stats(r.Context(), userID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, stats)
}

func (h *Handler) Progress(w http.ResponseWriter, r *http.Request) {
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

	progress, err := h.svc.Progress(r.Context(), userID, showID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, progress)
}
