package routes

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
)

type ShowResult struct {
	Title  string `json:"title"`
	Year   string `json:"year"`
	IMDBID string `json:"imdbID"`
	Type   string `json:"type"`
	Poster string `json:"poster"`
}

// Fetch from OMDB API
func fetchFromOMDB(query string) (*ShowResult, error) {
	apiKey := os.Getenv("OMDB_API_KEY")
	url := fmt.Sprintf("https://www.omdbapi.com/?t=%s&apikey=%s", query, apiKey)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)
	if result["Response"] == "False" {
		return nil, fmt.Errorf("Not found")
	}
	return &ShowResult{
		Title:  fmt.Sprintf("%v", result["Title"]),
		Year:   fmt.Sprintf("%v", result["Year"]),
		IMDBID: fmt.Sprintf("%v", result["imdbID"]),
		Type:   fmt.Sprintf("%v", result["Type"]),
		Poster: fmt.Sprintf("%v", result["Poster"]),
	}, nil
}

// Fetch from TMDB API
func fetchFromTMDB(query string) (*ShowResult, error) {
	apiKey := os.Getenv("TMDB_API_KEY")
	url := fmt.Sprintf("https://api.themoviedb.org/3/search/tv?api_key=%s&query=%s", apiKey, query)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)
	results, ok := result["results"].([]interface{})
	if !ok || len(results) == 0 {
		return nil, fmt.Errorf("Not found")
	}
	show := results[0].(map[string]interface{})
	return &ShowResult{
		Title:  fmt.Sprintf("%v", show["name"]),
		Year:   fmt.Sprintf("%v", show["first_air_date"]),
		IMDBID: "", // TMDB does not provide IMDB ID directly
		Type:   "tv",
		Poster: fmt.Sprintf("https://image.tmdb.org/t/p/w500%v", show["poster_path"]),
	}, nil
}
