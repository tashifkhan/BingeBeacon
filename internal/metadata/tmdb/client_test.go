package tmdb

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/tashifkhan/bingebeacon/internal/config"
	"golang.org/x/time/rate"
)

func TestClientRetriesTransientFailures(t *testing.T) {
	var attempts atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("api_key") != "test-key" {
			t.Fatal("TMDB API key was not attached")
		}
		if attempts.Add(1) < 3 {
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"page":1,"results":[]}`))
	}))
	defer server.Close()

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	client := NewClient(config.TMDBConfig{APIKey: "test-key", BaseURL: server.URL}, logger)
	client.limiter = rate.NewLimiter(rate.Inf, 1)

	if _, err := client.SearchMulti(context.Background(), "test", 1); err != nil {
		t.Fatalf("expected transient request to recover: %v", err)
	}
	if attempts.Load() != 3 {
		t.Fatalf("expected 3 attempts, got %d", attempts.Load())
	}
}
