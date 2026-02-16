package tmdb

type SearchResponse struct {
	Page         int            `json:"page"`
	Results      []SearchResult `json:"results"`
	TotalPages   int            `json:"total_pages"`
	TotalResults int            `json:"total_results"`
}

type SearchResult struct {
	ID           int     `json:"id"`
	MediaType    string  `json:"media_type"` // "tv" or "movie"
	Name         string  `json:"name"`       // for TV
	Title        string  `json:"title"`      // for Movie
	Overview     string  `json:"overview"`
	PosterPath   string  `json:"poster_path"`
	BackdropPath string  `json:"backdrop_path"`
	VoteAverage  float64 `json:"vote_average"`
	FirstAirDate string  `json:"first_air_date"` // for TV
	ReleaseDate  string  `json:"release_date"`   // for Movie
}

type ExternalIDsResponse struct {
	IMDBID      *string `json:"imdb_id"`
	TVDBID      *int    `json:"tvdb_id"`
	FreebaseMID *string `json:"freebase_mid"`
	FreebaseID  *string `json:"freebase_id"`
	TVRageID    *int    `json:"tvrage_id"`
	FacebookID  *string `json:"facebook_id"`
	InstagramID *string `json:"instagram_id"`
	TwitterID   *string `json:"twitter_id"`
	ID          int     `json:"id"`
}

type WatchProvidersResponse struct {
	Results map[string]WatchRegion `json:"results"`
}

type WatchRegion struct {
	Link     string          `json:"link"`
	Flatrate []WatchProvider `json:"flatrate"`
	Rent     []WatchProvider `json:"rent"`
	Buy      []WatchProvider `json:"buy"`
}

type WatchProvider struct {
	DisplayPriority int    `json:"display_priority"`
	LogoPath        string `json:"logo_path"`
	ProviderID      int    `json:"provider_id"`
	ProviderName    string `json:"provider_name"`
}

type TVShowDetail struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	Overview     string    `json:"overview"`
	PosterPath   string    `json:"poster_path"`
	BackdropPath string    `json:"backdrop_path"`
	Status       string    `json:"status"`
	FirstAirDate string    `json:"first_air_date"`
	Genres       []Genre   `json:"genres"`
	Networks     []Network `json:"networks"`
	Seasons      []Season  `json:"seasons"`
}

type Genre struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Network struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Season struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	Overview     string `json:"overview"`
	PosterPath   string `json:"poster_path"`
	SeasonNumber int    `json:"season_number"`
	EpisodeCount int    `json:"episode_count"`
	AirDate      string `json:"air_date"`
}

type SeasonDetail struct {
	ID           int       `json:"id"`
	AirDate      string    `json:"air_date"`
	Name         string    `json:"name"`
	Overview     string    `json:"overview"`
	PosterPath   string    `json:"poster_path"`
	SeasonNumber int       `json:"season_number"`
	Episodes     []Episode `json:"episodes"`
}

type Episode struct {
	ID            int     `json:"id"`
	AirDate       string  `json:"air_date"`
	EpisodeNumber int     `json:"episode_number"`
	Name          string  `json:"name"`
	Overview      string  `json:"overview"`
	StillPath     string  `json:"still_path"`
	VoteAverage   float64 `json:"vote_average"`
	Runtime       int     `json:"runtime"`
	SeasonNumber  int     `json:"season_number"`
	ShowID        int     `json:"show_id"`
}

type TrendingResponse struct {
	Page         int            `json:"page"`
	Results      []SearchResult `json:"results"`
	TotalPages   int            `json:"total_pages"`
	TotalResults int            `json:"total_results"`
}

type PopularResponse struct {
	Page         int            `json:"page"`
	Results      []SearchResult `json:"results"`
	TotalPages   int            `json:"total_pages"`
	TotalResults int            `json:"total_results"`
}
