package tmdb

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/tashifkhan/bingebeacon/internal/config"
	"golang.org/x/time/rate"
)

type Client struct {
	httpClient *http.Client
	apiKey     string
	baseURL    string
	logger     *slog.Logger
	limiter    *rate.Limiter
	breakerMu  sync.Mutex
	failures   int
	openUntil  time.Time
}

func NewClient(cfg config.TMDBConfig, logger *slog.Logger) *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		apiKey:  cfg.APIKey,
		baseURL: cfg.BaseURL,
		logger:  logger,
		limiter: rate.NewLimiter(rate.Every(250*time.Millisecond), 4),
	}
}

func (c *Client) do(ctx context.Context, method, path string, queryParams map[string]string, dest interface{}) error {
	if c.apiKey == "" {
		return fmt.Errorf("TMDB_API_KEY is not configured")
	}
	if err := c.checkCircuit(); err != nil {
		return err
	}

	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		if err := c.limiter.Wait(ctx); err != nil {
			return err
		}
		req, err := c.newRequest(ctx, method, path, queryParams)
		if err != nil {
			return err
		}
		c.logger.Debug("Calling TMDB API", "path", path, "attempt", attempt+1)
		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = err
			if err := waitForRetry(ctx, backoff(attempt)); err != nil {
				return err
			}
			continue
		}

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			if dest != nil {
				err = json.NewDecoder(resp.Body).Decode(dest)
			}
			resp.Body.Close()
			if err != nil {
				c.recordFailure()
				return err
			}
			c.recordSuccess()
			return nil
		}

		_, _ = io.Copy(io.Discard, resp.Body)
		resp.Body.Close()
		lastErr = fmt.Errorf("tmdb api error: status %d", resp.StatusCode)
		if resp.StatusCode != http.StatusTooManyRequests && resp.StatusCode < 500 {
			return lastErr
		}
		delay := retryDelay(resp.Header.Get("Retry-After"), attempt)
		c.logger.Warn("TMDB request will retry", "status", resp.StatusCode, "delay", delay)
		if err := waitForRetry(ctx, delay); err != nil {
			return err
		}
	}
	c.recordFailure()
	return lastErr
}

func (c *Client) newRequest(ctx context.Context, method, path string, queryParams map[string]string) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, nil)
	if err != nil {
		return nil, err
	}
	query := req.URL.Query()
	query.Set("api_key", c.apiKey)
	for key, value := range queryParams {
		query.Set(key, value)
	}
	req.URL.RawQuery = query.Encode()
	return req, nil
}

func (c *Client) checkCircuit() error {
	c.breakerMu.Lock()
	defer c.breakerMu.Unlock()
	if time.Now().Before(c.openUntil) {
		return fmt.Errorf("tmdb circuit is open until %s", c.openUntil.Format(time.RFC3339))
	}
	return nil
}

func (c *Client) recordSuccess() {
	c.breakerMu.Lock()
	c.failures = 0
	c.openUntil = time.Time{}
	c.breakerMu.Unlock()
}

func (c *Client) recordFailure() {
	c.breakerMu.Lock()
	defer c.breakerMu.Unlock()
	c.failures++
	if c.failures >= 5 {
		c.openUntil = time.Now().Add(30 * time.Second)
		c.failures = 0
	}
}

func backoff(attempt int) time.Duration {
	return time.Duration(1<<attempt) * 250 * time.Millisecond
}

func retryDelay(retryAfter string, attempt int) time.Duration {
	if seconds, err := strconv.Atoi(retryAfter); err == nil && seconds > 0 {
		return time.Duration(seconds) * time.Second
	}
	if when, err := http.ParseTime(retryAfter); err == nil {
		if delay := time.Until(when); delay > 0 {
			return delay
		}
	}
	return backoff(attempt)
}

func waitForRetry(ctx context.Context, delay time.Duration) error {
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
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

func (c *Client) GetMovie(ctx context.Context, tmdbID int) (*MovieDetail, error) {
	var resp MovieDetail
	err := c.do(ctx, "GET", fmt.Sprintf("/movie/%d", tmdbID), nil, &resp)
	return &resp, err
}

func (c *Client) GetTVSeason(ctx context.Context, tmdbID int, seasonNum int) (*SeasonDetail, error) {
	var resp SeasonDetail
	err := c.do(ctx, "GET", fmt.Sprintf("/tv/%d/season/%d", tmdbID, seasonNum), nil, &resp)
	return &resp, err
}

func (c *Client) GetExternalIDs(ctx context.Context, mediaType string, tmdbID int) (*ExternalIDsResponse, error) {
	if mediaType != "tv" && mediaType != "movie" {
		return nil, fmt.Errorf("unsupported media type %q", mediaType)
	}
	var resp ExternalIDsResponse
	err := c.do(ctx, "GET", fmt.Sprintf("/%s/%d/external_ids", mediaType, tmdbID), nil, &resp)
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

func (c *Client) GetWatchProviders(ctx context.Context, mediaType string, tmdbID int) (*WatchProvidersResponse, error) {
	var resp WatchProvidersResponse
	path := fmt.Sprintf("/%s/%d/watch/providers", mediaType, tmdbID)
	if err := c.do(ctx, "GET", path, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) GetChanges(ctx context.Context, mediaType string, from, to time.Time) (*ChangesResponse, error) {
	if mediaType != "tv" && mediaType != "movie" {
		return nil, fmt.Errorf("unsupported media type %q", mediaType)
	}
	var resp ChangesResponse
	err := c.do(ctx, http.MethodGet, fmt.Sprintf("/%s/changes", mediaType), map[string]string{
		"start_date": from.Format("2006-01-02"),
		"end_date":   to.Format("2006-01-02"),
	}, &resp)
	return &resp, err
}
