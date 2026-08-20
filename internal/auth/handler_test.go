package auth

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/tashifkhan/bingebeacon/internal/config"
)

func TestWebTokenPairUsesHTTPOnlyRefreshCookie(t *testing.T) {
	handler := NewHandler(nil, config.JWTConfig{RefreshTokenTTL: 7 * 24 * time.Hour}, "production")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
	req.Header.Set("X-Client-Platform", "web")
	res := httptest.NewRecorder()

	handler.writeTokenPair(res, req, http.StatusOK, &TokenPair{
		AccessToken: "access-value", RefreshToken: "refresh-value", ExpiresIn: 900,
	})

	if strings.Contains(res.Body.String(), "refresh-value") {
		t.Fatal("refresh token must not be exposed in the web response body")
	}
	cookies := res.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("expected one refresh cookie, got %d", len(cookies))
	}
	cookie := cookies[0]
	if cookie.Name != "bb_refresh_token" || cookie.Value != "refresh-value" {
		t.Fatalf("unexpected refresh cookie: %#v", cookie)
	}
	if !cookie.HttpOnly || !cookie.Secure || cookie.SameSite != http.SameSiteNoneMode {
		t.Fatalf("refresh cookie is missing production security attributes: %#v", cookie)
	}
}
