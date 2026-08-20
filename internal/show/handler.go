package show

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/tashifkhan/bingebeacon/internal/pkg/httputil"
)

type ImportRequest struct {
	TMDBID    int    `json:"tmdb_id"`
	MediaType string `json:"media_type"`
}

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	mediaType := r.URL.Query().Get("type")

	if query == "" {
		httputil.Error(w, http.StatusBadRequest, "Query parameter 'q' is required")
		return
	}

	results, err := h.svc.Search(r.Context(), query, mediaType)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.JSONWithCache(w, r, http.StatusOK, results, 60, 300)
}

func (h *Handler) Import(w http.ResponseWriter, r *http.Request) {
	var req ImportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.TMDBID <= 0 {
		httputil.Error(w, http.StatusBadRequest, "tmdb_id must be positive")
		return
	}

	result, err := h.svc.GetOrCreateByTMDBID(r.Context(), req.TMDBID, req.MediaType)
	if err != nil {
		httputil.Error(w, http.StatusBadGateway, err.Error())
		return
	}
	httputil.JSON(w, http.StatusCreated, result)
}

func (h *Handler) Trending(w http.ResponseWriter, r *http.Request) {
	results, err := h.svc.GetTrending(r.Context(), r.URL.Query().Get("type"), r.URL.Query().Get("window"))
	if err != nil {
		httputil.Error(w, http.StatusBadGateway, err.Error())
		return
	}
	httputil.JSONWithCache(w, r, http.StatusOK, results, 300, 3600)
}

func (h *Handler) Popular(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	results, err := h.svc.GetPopular(r.Context(), r.URL.Query().Get("type"), page)
	if err != nil {
		httputil.Error(w, http.StatusBadGateway, err.Error())
		return
	}
	httputil.JSONWithCache(w, r, http.StatusOK, results, 300, 3600)
}

func (h *Handler) GetShow(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid show ID")
		return
	}

	show, err := h.svc.GetShow(r.Context(), id)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "Show not found")
		return
	}

	httputil.JSONWithCache(w, r, http.StatusOK, show, 300, 3600)
}

func (h *Handler) GetSeason(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	seasonNumStr := vars["num"]

	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid show ID")
		return
	}

	seasonNum, err := strconv.Atoi(seasonNumStr)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid season number")
		return
	}

	season, err := h.svc.GetSeason(r.Context(), id, seasonNum)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "Season not found")
		return
	}

	httputil.JSONWithCache(w, r, http.StatusOK, season, 300, 3600)
}

func (h *Handler) GetEpisodes(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	upcoming := r.URL.Query().Get("upcoming") == "true"

	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid show ID")
		return
	}

	episodes, err := h.svc.GetEpisodes(r.Context(), id, upcoming)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "Episodes not found")
		return
	}

	httputil.JSONWithCache(w, r, http.StatusOK, episodes, 300, 3600)
}

func (h *Handler) GetSyncStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid show ID")
		return
	}

	show, err := h.svc.GetShow(r.Context(), id)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "Show not found")
		return
	}

	status := map[string]interface{}{
		"id":             show.ID,
		"last_synced_at": show.LastSyncedAt,
		"sync_priority":  show.SyncPriority,
		"status":         show.Status,
	}

	httputil.JSON(w, http.StatusOK, status)
}
