package main

import (
	"log"
	"net/http"

	"./routes"
)

func main() {
	mux := routes.NewRouter()
	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
