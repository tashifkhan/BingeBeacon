package thetvdb

type LoginRequest struct {
	APIKey string `json:"apikey"`
	PIN    string `json:"pin,omitempty"`
}

type LoginResponse struct {
	Status string `json:"status"`
	Data   struct {
		Token string `json:"token"`
	} `json:"data"`
}

type SeriesResponse struct {
	Status string `json:"status"`
	Data   Series `json:"data"`
}

type Series struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Slug   string `json:"slug"`
	Status struct {
		Name string `json:"name"`
	} `json:"status"`
	FirstAired string `json:"firstAired"`
}

type EpisodesResponse struct {
	Status string `json:"status"`
	Data   struct {
		Episodes []Episode `json:"episodes"`
	} `json:"data"`
}

type Episode struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Aired    string `json:"aired"`
	Runtime  int    `json:"runtime"`
	Season   int    `json:"seasonNumber"`
	Number   int    `json:"number"`
	Overview string `json:"overview"`
}
