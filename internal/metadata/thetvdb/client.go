package thetvdb

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/tashifkhan/bingebeacon/internal/config"
)

type Client struct {
	httpClient *http.Client
	apiKey     string
	pin        string
	baseURL    string
	logger     *slog.Logger
	token      string
	tokenExp   time.Time
}

func NewClient(cfg config.TheTVDBConfig, logger *slog.Logger) *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		apiKey:  cfg.APIKey,
		pin:     cfg.PIN,
		baseURL: cfg.BaseURL,
		logger:  logger,
	}
}

func (c *Client) authenticate(ctx context.Context) error {
	// If token is valid (with 5 min buffer), reuse it
	if c.token != "" && time.Now().Add(5*time.Minute).Before(c.tokenExp) {
		return nil
	}

	payload := LoginRequest{
		APIKey: c.apiKey,
		PIN:    c.pin,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/login", bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("thetvdb login failed: status %d", resp.StatusCode)
	}

	var result LoginResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return err
	}

	c.token = result.Data.Token
	// Token valid for 30 days, let's set expiry to 25 days to be safe
	c.tokenExp = time.Now().Add(25 * 24 * time.Hour)
	c.logger.Info("TheTVDB authenticated successfully")

	return nil
}

func (c *Client) do(ctx context.Context, method, path string, dest interface{}) error {
	if err := c.authenticate(ctx); err != nil {
		return err
	}

	url := fmt.Sprintf("%s%s", c.baseURL, path)
	req, err := http.NewRequestWithContext(ctx, method, url, nil)
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")

	c.logger.Debug("Calling TheTVDB API", "url", url)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("thetvdb api error: status %d", resp.StatusCode)
	}

	if dest != nil {
		if err := json.NewDecoder(resp.Body).Decode(dest); err != nil {
			return err
		}
	}

	return nil
}

func (c *Client) GetSeriesEpisodes(ctx context.Context, tvdbID int, seasonType string, lang string) (*EpisodesResponse, error) {
	// Use default language "eng" if not specified
	if lang == "" {
		lang = "eng"
	}
	// Use default season type "default" if not specified
	if seasonType == "" {
		seasonType = "default"
	}

	var resp EpisodesResponse
	path := fmt.Sprintf("/series/%d/episodes/%s/%s", tvdbID, seasonType, lang)
	err := c.do(ctx, "GET", path, &resp)
	return &resp, err
}

func (c *Client) GetSeries(ctx context.Context, tvdbID int) (*SeriesResponse, error) {
	var resp SeriesResponse
	path := fmt.Sprintf("/series/%d", tvdbID)
	err := c.do(ctx, "GET", path, &resp)
	return &resp, err
}
