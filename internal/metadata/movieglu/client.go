package movieglu

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/tashifkhan/bingebeacon/internal/config"
)

type Client struct {
	httpClient    *http.Client
	apiKey        string
	authorization string
	clientID      string
	territory     string
	baseURL       string
}

func NewClient(cfg config.MovieGluConfig) *Client {
	return &Client{
		httpClient:    &http.Client{Timeout: 10 * time.Second},
		apiKey:        cfg.APIKey,
		authorization: cfg.Authorization,
		clientID:      cfg.ClientID,
		territory:     cfg.Territory,
		baseURL:       cfg.BaseURL,
	}
}

type FilmShowTimesResponse struct {
	Films []FilmShowtime `json:"films"`
}

type FilmShowtime struct {
	FilmID    string           `json:"film_id"`
	FilmName  string           `json:"film_name"`
	Showtimes []CinemaShowtime `json:"showtimes"`
}

type CinemaShowtime struct {
	CinemaID   string   `json:"cinema_id"`
	CinemaName string   `json:"cinema_name"`
	Times      []string `json:"times"`
}

type CinemasNearbyResponse struct {
	Cinemas []Cinema `json:"cinemas"`
}

type Cinema struct {
	CinemaID   string `json:"cinema_id"`
	CinemaName string `json:"cinema_name"`
	Distance   string `json:"distance"`
}

type FilmLiveSearchResponse struct {
	Films []FilmSearchResult `json:"films"`
}

type FilmSearchResult struct {
	FilmID      string `json:"film_id"`
	FilmName    string `json:"film_name"`
	IMDBTitleID string `json:"imdb_title_id"`
}

func (c *Client) do(ctx context.Context, method, path string, query map[string]string, geolocation string, dest interface{}) error {
	u, err := url.Parse(c.baseURL)
	if err != nil {
		return err
	}
	u.Path = path

	q := u.Query()
	for k, v := range query {
		q.Set(k, v)
	}
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, method, u.String(), nil)
	if err != nil {
		return err
	}

	req.Header.Set("client", c.clientID)
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("authorization", c.authorization)
	req.Header.Set("territory", c.territory)
	req.Header.Set("api-version", "v200")
	req.Header.Set("device-datetime", time.Now().Format(time.RFC3339))
	if geolocation != "" {
		req.Header.Set("geolocation", geolocation)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("movieglu api error: status %d", resp.StatusCode)
	}

	if dest != nil {
		if err := json.NewDecoder(resp.Body).Decode(dest); err != nil {
			return err
		}
	}

	return nil
}

func (c *Client) FilmShowTimes(ctx context.Context, filmID string, date string, geolocation string) (*FilmShowTimesResponse, error) {
	var resp FilmShowTimesResponse
	err := c.do(ctx, "GET", "/filmShowTimes", map[string]string{
		"film_id": filmID,
		"date":    date,
	}, geolocation, &resp)
	return &resp, err
}

func (c *Client) CinemasNearby(ctx context.Context, geolocation string) (*CinemasNearbyResponse, error) {
	var resp CinemasNearbyResponse
	err := c.do(ctx, "GET", "/cinemasNearby", nil, geolocation, &resp)
	return &resp, err
}

func (c *Client) FilmLiveSearch(ctx context.Context, query string, geolocation string) (*FilmLiveSearchResponse, error) {
	var resp FilmLiveSearchResponse
	err := c.do(ctx, "GET", "/filmLiveSearch", map[string]string{
		"query": query,
	}, geolocation, &resp)
	return &resp, err
}
