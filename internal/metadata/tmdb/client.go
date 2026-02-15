package tmdb

import (
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
	baseURL    string
	logger     *slog.Logger
}

func NewClient(cfg config.TMDBConfig, logger *slog.Logger) *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		apiKey:  cfg.APIKey,
		baseURL: cfg.BaseURL,
		logger:  logger,
	}
}

func (c *Client) do(ctx context.Context, method, path string, queryParams map[string]string, dest interface{}) error {
	url := fmt.Sprintf("%s%s", c.baseURL, path)
	req, err := http.NewRequestWithContext(ctx, method, url, nil)
	if err != nil {
		return err
	}

	q := req.URL.Query()
	q.Add("api_key", c.apiKey)
	for k, v := range queryParams {
		q.Add(k, v)
	}
	req.URL.RawQuery = q.Encode()

	c.logger.Debug("Calling TMDB API", "url", req.URL.String())

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		// Handle rate limit (simple wait)
		retryAfter := resp.Header.Get("Retry-After")
		c.logger.Warn("TMDB Rate Limit Hit", "retry_after", retryAfter)
		// Ideally, parse retryAfter and sleep, but for now just return error
		return fmt.Errorf("tmdb rate limit exceeded")
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("tmdb api error: status %d", resp.StatusCode)
	}

	if dest != nil {
		if err := json.NewDecoder(resp.Body).Decode(dest); err != nil {
			return err
		}
	}

	return nil
}

func (c *Client) SearchMulti(ctx context.Context, query string, page int) (*SearchResponse, error) {
	var resp SearchResponse
	err := c.do(ctx, "GET", "/search/multi", map[string]string{
		"query": query,
		"page":  fmt.Sprintf("%d", page),
	}, &resp)
	return &resp, err
}

func (c *Client) GetTVShow(ctx context.Context, tmdbID int) (*TVShowDetail, error) {
	var resp TVShowDetail
	err := c.do(ctx, "GET", fmt.Sprintf("/tv/%d", tmdbID), nil, &resp)
	return &resp, err
}

func (c *Client) GetTVSeason(ctx context.Context, tmdbID int, seasonNum int) (*SeasonDetail, error) {
	var resp SeasonDetail
	err := c.do(ctx, "GET", fmt.Sprintf("/tv/%d/season/%d", tmdbID, seasonNum), nil, &resp)
	return &resp, err
}

func (c *Client) GetTrending(ctx context.Context, mediaType string, timeWindow string) (*TrendingResponse, error) {
	var resp TrendingResponse
	err := c.do(ctx, "GET", fmt.Sprintf("/trending/%s/%s", mediaType, timeWindow), nil, &resp)
	return &resp, err
}

func (c *Client) GetPopular(ctx context.Context, mediaType string, page int) (*PopularResponse, error) {
	var resp PopularResponse
	err := c.do(ctx, "GET", fmt.Sprintf("/%s/popular", mediaType), map[string]string{
		"page": fmt.Sprintf("%d", page),
	}, &resp)
	return &resp, err
}
