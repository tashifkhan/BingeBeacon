package streaming

import (
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

func (h *Handler) GetStreaming(w http.ResponseWriter, r *http.Request) {
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

	region := r.URL.Query().Get("region")

	result, err := h.svc.GetStreaming(r.Context(), showID, region)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, result)
}
