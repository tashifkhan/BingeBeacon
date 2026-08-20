package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/tashifkhan/bingebeacon/internal/config"
	appctx "github.com/tashifkhan/bingebeacon/internal/pkg/context"
)

func TestMiddlewareAcceptsAccessToken(t *testing.T) {
	cfg := config.JWTConfig{Secret: "test-secret-that-is-at-least-32-characters"}
	token := signedTestToken(t, cfg.Secret, "access")
	middleware := NewMiddleware(cfg)

	handler := middleware.Authenticate(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := appctx.UserID(r.Context()); !ok {
			t.Fatal("user ID was not added to the request context")
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusNoContent {
		t.Fatalf("expected %d, got %d", http.StatusNoContent, res.Code)
	}
}

func TestMiddlewareRejectsRefreshToken(t *testing.T) {
	cfg := config.JWTConfig{Secret: "test-secret-that-is-at-least-32-characters"}
	token := signedTestToken(t, cfg.Secret, "refresh")
	middleware := NewMiddleware(cfg)

	handler := middleware.Authenticate(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("protected handler must not receive refresh tokens")
	}))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected %d, got %d", http.StatusUnauthorized, res.Code)
	}
}

func signedTestToken(t *testing.T, secret, tokenType string) string {
	t.Helper()
	claims := jwt.MapClaims{
		"user_id": uuid.NewString(),
		"type":    tokenType,
		"exp":     time.Now().Add(time.Hour).Unix(),
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("sign test token: %v", err)
	}
	return token
}
