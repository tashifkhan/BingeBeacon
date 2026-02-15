package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/tashifkhan/bingebeacon/internal/config"
	"github.com/tashifkhan/bingebeacon/internal/pkg/db"
	"github.com/tashifkhan/bingebeacon/internal/server"
)

func main() {
	cfg := config.Load()

	// Run migrations
	dbURL := fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.DBName,
		cfg.Database.SSLMode,
	)
	if err := db.RunMigrations(dbURL, "migrations"); err != nil {
		slog.Error("Failed to run migrations", "error", err)
		// Don't exit, maybe just log? Or exit if critical?
		// Usually schema mismatch is critical.
		os.Exit(1)
	}

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
