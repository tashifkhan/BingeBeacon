package main

import (
	"log/slog"
	"os"

	"github.com/tashifkhan/bingebeacon/internal/config"
	"github.com/tashifkhan/bingebeacon/internal/server"
)

func main() {
	cfg := config.Load()

	srv, err := server.NewServer(cfg)
	if err != nil {
		slog.Error("Failed to initialize server", "error", err)
		os.Exit(1)
	}

	if err := srv.Start(); err != nil {
		slog.Error("Server failed to start", "error", err)
		os.Exit(1)
	}
}
