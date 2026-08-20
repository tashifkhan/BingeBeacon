package auth

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/tashifkhan/bingebeacon/internal/config"
	"github.com/tashifkhan/bingebeacon/internal/pkg/httputil"
)

type Handler struct {
	svc         *Service
	cfg         config.JWTConfig
	environment string
}

func NewHandler(svc *Service, cfg config.JWTConfig, environment string) *Handler {
	return &Handler{svc: svc, cfg: cfg, environment: environment}
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	tokenPair, err := h.svc.Register(req)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	h.writeTokenPair(w, r, http.StatusCreated, tokenPair)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	tokenPair, err := h.svc.Login(req)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, err.Error())
		return
	}

	h.writeTokenPair(w, r, http.StatusOK, tokenPair)
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		httputil.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.RefreshToken == "" {
		if cookie, err := r.Cookie("bb_refresh_token"); err == nil {
			req.RefreshToken = cookie.Value
		}
	}
	if req.RefreshToken == "" {
		httputil.Error(w, http.StatusUnauthorized, "refresh token required")
		return
	}

	tokenPair, err := h.svc.RefreshToken(req.RefreshToken)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, err.Error())
		return
	}

	h.writeTokenPair(w, r, http.StatusOK, tokenPair)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		httputil.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.RefreshToken == "" {
		if cookie, err := r.Cookie("bb_refresh_token"); err == nil {
			req.RefreshToken = cookie.Value
		}
	}

	if req.RefreshToken != "" {
		if err := h.svc.Logout(req.RefreshToken); err != nil {
			httputil.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	h.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) writeTokenPair(w http.ResponseWriter, r *http.Request, status int, tokenPair *TokenPair) {
	if r.Header.Get("X-Client-Platform") == "web" {
		h.setRefreshCookie(w, tokenPair.RefreshToken)
		response := *tokenPair
		response.RefreshToken = ""
		httputil.JSON(w, status, &response)
		return
	}
	httputil.JSON(w, status, tokenPair)
}

func (h *Handler) setRefreshCookie(w http.ResponseWriter, token string) {
	secure := h.environment == "production"
	sameSite := http.SameSiteLaxMode
	if secure {
		sameSite = http.SameSiteNoneMode
	}
	http.SetCookie(w, &http.Cookie{
		Name: "bb_refresh_token", Value: token, Path: "/api/v1/auth",
		HttpOnly: true, Secure: secure, SameSite: sameSite,
		MaxAge: int(h.cfg.RefreshTokenTTL.Seconds()), Expires: time.Now().Add(h.cfg.RefreshTokenTTL),
	})
}

func (h *Handler) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name: "bb_refresh_token", Value: "", Path: "/api/v1/auth",
		HttpOnly: true, Secure: h.environment == "production",
		SameSite: http.SameSiteLaxMode, MaxAge: -1, Expires: time.Unix(0, 0),
	})
}
