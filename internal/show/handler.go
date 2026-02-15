package show

import (
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/tashifkhan/bingebeacon/internal/pkg/httputil"
)

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

	httputil.JSON(w, http.StatusOK, results)
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

	httputil.JSON(w, http.StatusOK, show)
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

	httputil.JSON(w, http.StatusOK, season)
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

	httputil.JSON(w, http.StatusOK, episodes)
}
