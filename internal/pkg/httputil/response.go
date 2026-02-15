package httputil

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
)

type Response struct {
	Data interface{} `json:"data,omitempty"`
}

type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

func JSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(Response{Data: data})
}

func Error(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{
		Error: ErrorDetail{
			Message: message,
		},
	})
}

func ErrorWithDetails(w http.ResponseWriter, status int, message string, details interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{
		Error: ErrorDetail{
			Message: message,
			Details: details,
		},
	})
}

func JSONWithCache(w http.ResponseWriter, r *http.Request, status int, data interface{}, maxAge, staleWhileRevalidate int) {
	w.Header().Set("Content-Type", "application/json")

	// Calculate ETag
	jsonBytes, err := json.Marshal(Response{Data: data})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to marshal response")
		return
	}

	hash := md5.Sum(jsonBytes)
	etag := fmt.Sprintf(`"%s"`, hex.EncodeToString(hash[:]))
	w.Header().Set("ETag", etag)

	// Check If-None-Match
	if match := r.Header.Get("If-None-Match"); match != "" {
		if match == etag {
			w.WriteHeader(http.StatusNotModified)
			return
		}
	}

	// Cache-Control
	cacheControl := fmt.Sprintf("public, max-age=%d", maxAge)
	if staleWhileRevalidate > 0 {
		cacheControl += fmt.Sprintf(", stale-while-revalidate=%d", staleWhileRevalidate)
	}
	w.Header().Set("Cache-Control", cacheControl)

	w.WriteHeader(status)
	w.Write(jsonBytes)
}

func Paginated(w http.ResponseWriter, data interface{}, total int64, page, perPage int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": data,
		"meta": map[string]interface{}{
			"total":    total,
			"page":     page,
			"per_page": perPage,
		},
	})
}
