package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/redis/go-redis/v9"
	"github.com/rs/cors"
	"github.com/tashifkhan/bingebeacon/internal/alert"
	"github.com/tashifkhan/bingebeacon/internal/auth"
	"github.com/tashifkhan/bingebeacon/internal/config"
	"github.com/tashifkhan/bingebeacon/internal/metadata"
	"github.com/tashifkhan/bingebeacon/internal/metadata/omdb"
	"github.com/tashifkhan/bingebeacon/internal/metadata/tmdb"
	"github.com/tashifkhan/bingebeacon/internal/notification"
	"github.com/tashifkhan/bingebeacon/internal/pkg/cache"
	"github.com/tashifkhan/bingebeacon/internal/pkg/db"
	"github.com/tashifkhan/bingebeacon/internal/pkg/httputil"
	"github.com/tashifkhan/bingebeacon/internal/pkg/logger"
	"github.com/tashifkhan/bingebeacon/internal/scheduler"
	"github.com/tashifkhan/bingebeacon/internal/scheduler/jobs"
	"github.com/tashifkhan/bingebeacon/internal/show"
	"github.com/tashifkhan/bingebeacon/internal/timeline"
	"github.com/tashifkhan/bingebeacon/internal/user"
	"gorm.io/gorm"
)

type Server struct {
	router     *mux.Router
	config     *config.Config
	db         *gorm.DB
	redis      *redis.Client
	logger     *slog.Logger
	httpServer *http.Server
	syncer     *metadata.Syncer
	scheduler  *scheduler.Scheduler
}

func NewServer(cfg *config.Config) (*Server, error) {
	// 1. Init Logger
	logger.Init(cfg.Server.Environment)
	log := logger.Log

	// 2. Init DB
	database, err := db.NewPostgresDB(cfg.Database)
	if err != nil {
		return nil, err
	}

	// 3. Init Redis
	rdb, err := cache.NewRedisClient(cfg.Redis)
	if err != nil {
		return nil, err
	}

	// 4. Init Router
	r := mux.NewRouter()

	// 5. Init Modules & Dependencies

	// Repositories
	userRepo := user.NewRepository(database)
	authRepo := auth.NewRepository(database)
	showRepo := show.NewRepository(database)
	alertRepo := alert.NewRepository(database)
	timelineRepo := timeline.NewRepository(database)
	notifRepo := notification.NewRepository(database)

	// External Clients
	tmdbClient := tmdb.NewClient(cfg.TMDB, log)
	omdbClient := omdb.NewClient(cfg.OMDB)

	// FCM (Optional - warn if failed)
	fcmClient, err := notification.NewFCMClient(cfg.FCM.CredentialsFile, log)
	if err != nil {
		log.Warn("FCM initialization failed", "error", err)
		// Assuming we can run without FCM for dev/test
	}

	// Services
	userSvc := user.NewService(userRepo)
	authSvc := auth.NewService(authRepo, userRepo, cfg.JWT)
	showSvc := show.NewService(showRepo, tmdbClient, rdb)
	notifSvc := notification.NewService(notifRepo)

	// Syncer
	syncer := metadata.NewSyncer(tmdbClient, omdbClient, showRepo, alertRepo, timelineRepo, log)

	alertSvc := alert.NewService(alertRepo, showSvc, showRepo, syncer)
	timelineSvc := timeline.NewService(timelineRepo)

	// Handlers
	userHandler := user.NewHandler(userSvc)
	authHandler := auth.NewHandler(authSvc)
	showHandler := show.NewHandler(showSvc)
	alertHandler := alert.NewHandler(alertSvc)
	timelineHandler := timeline.NewHandler(timelineSvc)
	notifHandler := notification.NewHandler(notifSvc)

	// Scheduler
	sched := scheduler.NewScheduler(log)
	sched.Register(jobs.NewEpisodeSyncJob(syncer, alertRepo, log))
	if fcmClient != nil {
		sched.Register(jobs.NewNotificationDispatchJob(notifRepo, userRepo, fcmClient, log))
	}
	sched.Register(jobs.NewStaleCleanupJob(notifRepo, log))

	// Middleware
	authMiddleware := auth.NewMiddleware(cfg.JWT)

	// 6. Register Routes
	api := r.PathPrefix("/api/v1").Subrouter()

	// Auth Routes
	api.HandleFunc("/auth/register", authHandler.Register).Methods("POST")
	api.HandleFunc("/auth/login", authHandler.Login).Methods("POST")
	api.HandleFunc("/auth/refresh", authHandler.Refresh).Methods("POST")
	api.HandleFunc("/auth/logout", authHandler.Logout).Methods("POST")

	// User Routes (Protected)
	userRouter := api.PathPrefix("/me").Subrouter()
	userRouter.Use(authMiddleware.Authenticate)
	userRouter.HandleFunc("", userHandler.GetProfile).Methods("GET")
	userRouter.HandleFunc("", userHandler.UpdateProfile).Methods("PATCH")
	userRouter.HandleFunc("/devices", userHandler.RegisterDevice).Methods("POST")
	userRouter.HandleFunc("/devices/{id}", userHandler.UnregisterDevice).Methods("DELETE")

	// Show Routes (Public)
	showRouter := api.PathPrefix("/shows").Subrouter()
	showRouter.HandleFunc("/search", showHandler.Search).Methods("GET")
	showRouter.HandleFunc("/{id}", showHandler.GetShow).Methods("GET")
	showRouter.HandleFunc("/{id}/seasons/{num}", showHandler.GetSeason).Methods("GET")
	showRouter.HandleFunc("/{id}/episodes", showHandler.GetEpisodes).Methods("GET")

	// Tracking Routes (Protected)
	trackingRouter := api.PathPrefix("/tracking").Subrouter()
	trackingRouter.Use(authMiddleware.Authenticate)
	trackingRouter.HandleFunc("", alertHandler.GetTrackedShows).Methods("GET")
	trackingRouter.HandleFunc("", alertHandler.TrackShow).Methods("POST")
	trackingRouter.HandleFunc("/{show_id}", alertHandler.UpdateTracking).Methods("PATCH")
	trackingRouter.HandleFunc("/{show_id}", alertHandler.UntrackShow).Methods("DELETE")
	trackingRouter.HandleFunc("/favorites", alertHandler.GetFavorites).Methods("GET")
	trackingRouter.HandleFunc("/{show_id}/favorite", alertHandler.ToggleFavorite).Methods("POST")

	// Timeline Routes (Protected)
	timelineRouter := api.PathPrefix("/timeline").Subrouter()
	timelineRouter.Use(authMiddleware.Authenticate)
	timelineRouter.HandleFunc("", timelineHandler.GetTimeline).Methods("GET")
	timelineRouter.HandleFunc("/today", timelineHandler.GetToday).Methods("GET")
	timelineRouter.HandleFunc("/week", timelineHandler.GetThisWeek).Methods("GET")
	timelineRouter.HandleFunc("/upcoming", timelineHandler.GetUpcoming).Methods("GET")

	// Notification Routes (Protected)
	notifRouter := api.PathPrefix("/notifications").Subrouter()
	notifRouter.Use(authMiddleware.Authenticate)
	notifRouter.HandleFunc("", notifHandler.GetNotifications).Methods("GET")
	notifRouter.HandleFunc("/unread-count", notifHandler.GetUnreadCount).Methods("GET")
	notifRouter.HandleFunc("/read-all", notifHandler.MarkAllRead).Methods("POST")
	notifRouter.HandleFunc("/{id}/read", notifHandler.MarkRead).Methods("PATCH")

	// Internal/Admin Routes
	internalRouter := r.PathPrefix("/api/internal").Subrouter()
	// Add simple auth or ip restriction middleware here if needed
	internalRouter.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		// Simple health check
		dbStatus := "up"
		if sqlDB, err := database.DB(); err != nil || sqlDB.Ping() != nil {
			dbStatus = "down"
		}
		redisStatus := "up"
		if rdb.Ping(context.Background()).Err() != nil {
			redisStatus = "down"
		}
		httputil.JSON(w, http.StatusOK, map[string]string{
			"status": "ok",
			"db":     dbStatus,
			"redis":  redisStatus,
		})
	}).Methods("GET")

	internalRouter.HandleFunc("/sync/trigger", func(w http.ResponseWriter, r *http.Request) {
		// Manual sync trigger
		// Expects query param show_id
		showIDStr := r.URL.Query().Get("show_id")
		if showIDStr == "" {
			httputil.Error(w, http.StatusBadRequest, "show_id required")
			return
		}
		showID, err := uuid.Parse(showIDStr)
		if err != nil {
			httputil.Error(w, http.StatusBadRequest, "invalid show_id")
			return
		}

		// Run sync in background or foreground? Foreground for feedback
		if err := syncer.SyncShow(r.Context(), showID); err != nil {
			httputil.Error(w, http.StatusInternalServerError, err.Error())
			return
		}

		httputil.JSON(w, http.StatusOK, map[string]string{"message": "Sync triggered successfully"})
	}).Methods("POST")

	// 7. CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"}, // Customize for production
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	})

	srv := &Server{
		router:    r,
		config:    cfg,
		db:        database,
		redis:     rdb,
		logger:    log,
		scheduler: sched,
	}

	srv.httpServer = &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Server.Port),
		Handler: c.Handler(r),
	}

	return srv, nil
}

func (s *Server) Start() error {
	s.logger.Info("Starting server", "port", s.config.Server.Port, "env", s.config.Server.Environment)

	// Start Scheduler
	s.scheduler.Start()

	go func() {
		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.logger.Error("Server failed", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit

	s.logger.Info("Server shutting down...")

	s.scheduler.Stop()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := s.httpServer.Shutdown(ctx); err != nil {
		return fmt.Errorf("server forced to shutdown: %w", err)
	}

	return nil
}
