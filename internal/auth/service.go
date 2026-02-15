package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/tashifkhan/bingebeacon/internal/config"
	"github.com/tashifkhan/bingebeacon/internal/user"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo     *Repository
	userRepo *user.Repository
	cfg      config.JWTConfig
}

func NewService(repo *Repository, userRepo *user.Repository, cfg config.JWTConfig) *Service {
	return &Service{
		repo:     repo,
		userRepo: userRepo,
		cfg:      cfg,
	}
}

func (s *Service) Register(req RegisterRequest) (*TokenPair, error) {
	// Check if user exists
	if _, err := s.userRepo.FindByEmail(req.Email); err == nil {
		return nil, errors.New("email already registered")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	newUser := &user.User{
		Email:        req.Email,
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
	}

	if err := s.userRepo.Create(newUser); err != nil {
		return nil, err
	}

	return s.generateTokenPair(newUser.ID)
}

func (s *Service) Login(req LoginRequest) (*TokenPair, error) {
	u, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	return s.generateTokenPair(u.ID)
}

func (s *Service) RefreshToken(tokenStr string) (*TokenPair, error) {
	// Verify refresh token in DB
	storedToken, err := s.repo.FindRefreshToken(tokenStr)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	if storedToken.ExpiresAt.Before(time.Now()) {
		s.repo.DeleteRefreshToken(tokenStr)
		return nil, errors.New("refresh token expired")
	}

	// Delete used token (rotation)
	if err := s.repo.DeleteRefreshToken(tokenStr); err != nil {
		return nil, err
	}

	return s.generateTokenPair(storedToken.UserID)
}

func (s *Service) Logout(tokenStr string) error {
	return s.repo.DeleteRefreshToken(tokenStr)
}

func (s *Service) generateTokenPair(userID uuid.UUID) (*TokenPair, error) {
	// Access Token
	accessTokenClaims := jwt.MapClaims{
		"user_id": userID.String(),
		"exp":     time.Now().Add(s.cfg.AccessTokenTTL).Unix(),
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessTokenClaims)
	accessTokenString, err := accessToken.SignedString([]byte(s.cfg.Secret))
	if err != nil {
		return nil, err
	}

	// Refresh Token
	refreshTokenClaims := jwt.MapClaims{
		"user_id": userID.String(),
		"exp":     time.Now().Add(s.cfg.RefreshTokenTTL).Unix(),
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshTokenClaims)
	refreshTokenString, err := refreshToken.SignedString([]byte(s.cfg.Secret))
	if err != nil {
		return nil, err
	}

	// Store Refresh Token in DB
	err = s.repo.CreateRefreshToken(&RefreshToken{
		UserID:    userID,
		Token:     refreshTokenString,
		ExpiresAt: time.Now().Add(s.cfg.RefreshTokenTTL),
	})
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresIn:    int64(s.cfg.AccessTokenTTL.Seconds()),
	}, nil
}
