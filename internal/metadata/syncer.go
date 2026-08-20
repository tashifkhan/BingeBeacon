package metadata

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/tashifkhan/bingebeacon/internal/alert"
	"github.com/tashifkhan/bingebeacon/internal/metadata/omdb"
	"github.com/tashifkhan/bingebeacon/internal/metadata/thetvdb"
	"github.com/tashifkhan/bingebeacon/internal/metadata/tmdb"
	"github.com/tashifkhan/bingebeacon/internal/notification"
	"github.com/tashifkhan/bingebeacon/internal/pkg/cache"
	"github.com/tashifkhan/bingebeacon/internal/show"
	"github.com/tashifkhan/bingebeacon/internal/timeline"
	"gorm.io/datatypes"
)

type Syncer struct {
	tmdb         *tmdb.Client
	omdb         *omdb.Client
	thetvdb      *thetvdb.Client
	showRepo     *show.Repository
	alertRepo    *alert.Repository
	timelineRepo *timeline.Repository
	notifRepo    *notification.Repository
	syncRepo     *Repository
	redis        *redis.Client
	logger       *slog.Logger
}

func NewSyncer(
	tmdb *tmdb.Client,
	omdb *omdb.Client,
	thetvdb *thetvdb.Client,
	showRepo *show.Repository,
	alertRepo *alert.Repository,
	timelineRepo *timeline.Repository,
	notifRepo *notification.Repository,
	syncRepo *Repository,
	rdb *redis.Client,
	logger *slog.Logger,
) *Syncer {
	return &Syncer{
		tmdb:         tmdb,
		omdb:         omdb,
		thetvdb:      thetvdb,
		showRepo:     showRepo,
		alertRepo:    alertRepo,
		timelineRepo: timelineRepo,
		notifRepo:    notifRepo,
		syncRepo:     syncRepo,
		redis:        rdb,
		logger:       logger,
	}
}

func (s *Syncer) SyncShow(ctx context.Context, showID uuid.UUID) error {
	entry, logErr := s.syncRepo.Start("multi", &showID)
	err := s.syncShow(ctx, showID)
	if logErr == nil {
		status := "success"
		if err != nil {
			status = "failed"
		}
		if finishErr := s.syncRepo.Finish(entry.ID, status, 0, err); finishErr != nil {
			s.logger.Warn("Failed to finish sync log", "show_id", showID, "error", finishErr)
		}
	}
	return err
}

func (s *Syncer) syncShow(ctx context.Context, showID uuid.UUID) error {
	s.logger.Info("Syncing show", "show_id", showID)

	localShow, err := s.showRepo.FindByID(showID)
	if err != nil {
		return fmt.Errorf("failed to find show: %w", err)
	}
	if localShow.TMDBID == nil {
		return fmt.Errorf("show has no TMDB ID")
	}
	if localShow.MediaType == "movie" {
		return s.syncMovie(ctx, localShow)
	}
	if localShow.MediaType != "tv" {
		return fmt.Errorf("unsupported media type %q", localShow.MediaType)
	}

	tmdbShow, err := s.tmdb.GetTVShow(ctx, *localShow.TMDBID)
	if err != nil {
		return fmt.Errorf("tmdb fetch failed: %w", err)
	}

	previousStatus := show.SafeString(localShow.Status)
	// Update Show
	localShow.Title = tmdbShow.Name
	localShow.Overview = &tmdbShow.Overview
	localShow.PosterURL = &tmdbShow.PosterPath
	localShow.BackdropURL = &tmdbShow.BackdropPath
	localShow.Status = &tmdbShow.Status
	localShow.LastSyncedAt = time.Now()

	// Update Genres
	var genres []string
	for _, g := range tmdbShow.Genres {
		genres = append(genres, g.Name)
	}
	localShow.Genres = genres

	// Update Network (take the first one)
	if len(tmdbShow.Networks) > 0 {
		localShow.Network = &tmdbShow.Networks[0].Name
	}

	// Fetch External IDs
	extIDs, err := s.tmdb.GetExternalIDs(ctx, "tv", *localShow.TMDBID)
	if err == nil {
		localShow.IMDBID = extIDs.IMDBID
		localShow.TheTVDBID = extIDs.TVDBID
	} else {
		s.logger.Warn("Failed to fetch external IDs from TMDB", "show_id", showID, "error", err)
	}

	// Enrich with OMDB Ratings (if IMDB ID exists)
	if localShow.IMDBID != nil && *localShow.IMDBID != "" {
		omdbDetail, err := s.omdb.GetByIMDBID(ctx, *localShow.IMDBID)
		if err == nil {
			// Construct JSON blob
			// We can just dump the whole response or select fields.
			// Let's select key fields to be safe and clean.
			ratingsMap := map[string]interface{}{
				"imdb_rating":     omdbDetail.ImdbRating,
				"imdb_votes":      omdbDetail.ImdbVotes,
				"metascore":       omdbDetail.Metascore,
				"rated":           omdbDetail.Rated,
				"awards":          omdbDetail.Awards,
				"director":        omdbDetail.Director,
				"actors":          omdbDetail.Actors,
				"source":          "omdb",
				"enriched_at":     time.Now().Format(time.RFC3339),
				"rotten_tomatoes": "", // Try to find RT in Ratings array
			}

			for _, r := range omdbDetail.Ratings {
				if r.Source == "Rotten Tomatoes" {
					ratingsMap["rotten_tomatoes"] = r.Value
					break
				}
			}

			jsonBytes, _ := json.Marshal(ratingsMap)
			localShow.Ratings = datatypes.JSON(jsonBytes)
		} else {
			s.logger.Warn("Failed to enrich with OMDB", "imdb_id", *localShow.IMDBID, "error", err)
		}
	}

	if err := s.showRepo.UpsertFromTMDB(localShow); err != nil {
		return fmt.Errorf("failed to update show: %w", err)
	}
	if previousStatus != "" && previousStatus != tmdbShow.Status {
		s.createStatusEvent(localShow, previousStatus, tmdbShow.Status)
	}

	var episodesToBackfill []*show.Episode

	for _, tmdbSeason := range tmdbShow.Seasons {
		fullSeason, err := s.tmdb.GetTVSeason(ctx, *localShow.TMDBID, tmdbSeason.SeasonNumber)
		if err != nil {
			s.logger.Error("Failed to fetch season details", "season", tmdbSeason.SeasonNumber, "error", err)
			continue
		}

		seasonName := fullSeason.Name
		seasonOverview := fullSeason.Overview
		seasonPoster := fullSeason.PosterPath
		seasonAirDate := parseDate(fullSeason.AirDate)
		epCount := len(fullSeason.Episodes)
		seasonTMDBID := fullSeason.ID

		season := &show.Season{
			ShowID:       localShow.ID,
			SeasonNumber: fullSeason.SeasonNumber,
			Name:         &seasonName,
			Overview:     &seasonOverview,
			PosterURL:    &seasonPoster,
			AirDate:      seasonAirDate,
			EpisodeCount: &epCount,
			TMDBID:       &seasonTMDBID,
		}

		if err := s.showRepo.UpsertSeason(season); err != nil {
			s.logger.Error("Failed to upsert season", "season", season.SeasonNumber, "error", err)
			continue
		}

		for _, tmdbEp := range fullSeason.Episodes {
			epName := tmdbEp.Name
			epOverview := tmdbEp.Overview
			epAirDate := parseDate(tmdbEp.AirDate)
			epStill := tmdbEp.StillPath
			epRuntime := tmdbEp.Runtime
			epTMDBID := tmdbEp.ID

			ep := &show.Episode{
				ShowID:         localShow.ID,
				SeasonID:       season.ID,
				SeasonNumber:   season.SeasonNumber,
				EpisodeNumber:  tmdbEp.EpisodeNumber,
				Title:          &epName,
				Overview:       &epOverview,
				AirDate:        epAirDate,
				RuntimeMinutes: &epRuntime,
				StillURL:       &epStill,
				TMDBID:         &epTMDBID,
			}

			// If AirDate is missing, mark for backfill
			if ep.AirDate == nil {
				episodesToBackfill = append(episodesToBackfill, ep)
			}

			created, err := s.showRepo.UpsertEpisode(ep)
			if err != nil {
				s.logger.Error("Failed to upsert episode", "ep", ep.EpisodeNumber, "error", err)
				continue
			}

			if created && ep.AirDate != nil && ep.AirDate.After(time.Now()) {
				// New upcoming episode -> Generate Timeline Event
				s.createTimelineEvent(localShow, season, ep)
			}
		}
	}

	// Backfill Air Dates from TheTVDB if needed
	if len(episodesToBackfill) > 0 && localShow.TheTVDBID != nil {
		if err := s.backfillAirDates(ctx, *localShow.TheTVDBID, episodesToBackfill); err != nil {
			s.logger.Warn("Failed to backfill air dates", "error", err)
		}
	}

	// Invalidate Cache
	// - Show details: show:{id}
	// - Seasons: season:{id}:*
	// - Episodes: episodes:{id}:*
	s.redis.Del(ctx, fmt.Sprintf("show:%s", showID))
	cache.Invalidate(ctx, s.redis, fmt.Sprintf("season:%s:*", showID))
	cache.Invalidate(ctx, s.redis, fmt.Sprintf("episodes:%s:*", showID))

	return nil
}

func (s *Syncer) RecentLogs(limit int) ([]SyncLog, error) {
	return s.syncRepo.Recent(limit)
}

func (s *Syncer) SyncChanged(ctx context.Context, from, to time.Time) error {
	for _, mediaType := range []string{"tv", "movie"} {
		changes, err := s.tmdb.GetChanges(ctx, mediaType, from, to)
		if err != nil {
			return err
		}
		ids := make([]int, 0, len(changes.Results))
		for _, item := range changes.Results {
			ids = append(ids, item.ID)
		}
		localShows, err := s.showRepo.FindByTMDBIDs(mediaType, ids)
		if err != nil {
			return err
		}
		for i := range localShows {
			if err := s.SyncShow(ctx, localShows[i].ID); err != nil {
				s.logger.Warn("Changed title sync failed", "show_id", localShows[i].ID, "error", err)
			}
		}
	}
	return nil
}

func (s *Syncer) createTimelineEvent(show *show.Show, season *show.Season, ep *show.Episode) {
	eventType := "new_episode"
	if ep.EpisodeNumber == 1 {
		if season.SeasonNumber == 1 {
			eventType = "series_premiere"
		} else {
			eventType = "season_premiere"
		}
	}
	event := &timeline.TimelineEvent{
		ShowID:        show.ID,
		EventType:     eventType,
		Title:         fmt.Sprintf("%s - S%02dE%02d", show.Title, season.SeasonNumber, ep.EpisodeNumber),
		Description:   ep.Overview,
		EventDate:     *ep.AirDate,
		SeasonNumber:  &season.SeasonNumber,
		EpisodeNumber: &ep.EpisodeNumber,
		EpisodeID:     &ep.ID,
		Metadata:      datatypes.JSON([]byte("{}")),
	}
	if err := s.timelineRepo.Create(event); err != nil {
		s.logger.Error("Failed to create timeline event", "error", err)
		return
	}
	s.queueNotifications(event)
}

func (s *Syncer) syncMovie(ctx context.Context, localShow *show.Show) error {
	movie, err := s.tmdb.GetMovie(ctx, *localShow.TMDBID)
	if err != nil {
		return fmt.Errorf("tmdb movie fetch failed: %w", err)
	}

	previousStatus := show.SafeString(localShow.Status)
	localShow.Title = movie.Title
	localShow.Overview = &movie.Overview
	localShow.PosterURL = &movie.PosterPath
	localShow.BackdropURL = &movie.BackdropPath
	localShow.Status = &movie.Status
	localShow.PremiereDate = parseDate(movie.ReleaseDate)
	localShow.LastSyncedAt = time.Now()
	localShow.Genres = localShow.Genres[:0]
	for _, genre := range movie.Genres {
		localShow.Genres = append(localShow.Genres, genre.Name)
	}

	if extIDs, extErr := s.tmdb.GetExternalIDs(ctx, "movie", *localShow.TMDBID); extErr == nil {
		localShow.IMDBID = extIDs.IMDBID
	} else {
		s.logger.Warn("Failed to fetch movie external IDs", "show_id", localShow.ID, "error", extErr)
	}
	s.enrichFromOMDB(ctx, localShow)

	if err := s.showRepo.UpsertFromTMDB(localShow); err != nil {
		return fmt.Errorf("failed to update movie: %w", err)
	}
	if previousStatus != "" && previousStatus != movie.Status {
		s.createStatusEvent(localShow, previousStatus, movie.Status)
	}
	if localShow.PremiereDate != nil && localShow.PremiereDate.After(time.Now()) {
		if _, findErr := s.timelineRepo.FindByShowTypeAndDate(localShow.ID, "movie_release", *localShow.PremiereDate); findErr != nil {
			event := &timeline.TimelineEvent{
				ShowID:      localShow.ID,
				EventType:   "movie_release",
				Title:       fmt.Sprintf("%s releases", localShow.Title),
				Description: localShow.Overview,
				EventDate:   *localShow.PremiereDate,
				Metadata:    datatypes.JSON([]byte("{}")),
			}
			if createErr := s.timelineRepo.Create(event); createErr != nil {
				s.logger.Error("Failed to create movie release event", "error", createErr)
			} else {
				s.queueNotifications(event)
			}
		}
	}

	s.redis.Del(ctx, fmt.Sprintf("show:%s", localShow.ID))
	return nil
}

func (s *Syncer) createStatusEvent(localShow *show.Show, previousStatus, currentStatus string) {
	description := fmt.Sprintf("Status changed from %s to %s", previousStatus, currentStatus)
	event := &timeline.TimelineEvent{
		ShowID: localShow.ID, EventType: "status_change",
		Title: fmt.Sprintf("%s status updated", localShow.Title), Description: &description,
		EventDate: time.Now(), Metadata: datatypes.JSON([]byte("{}")),
	}
	if err := s.timelineRepo.Create(event); err != nil {
		s.logger.Error("Failed to create status event", "show_id", localShow.ID, "error", err)
		return
	}
	s.queueNotifications(event)
}

func (s *Syncer) enrichFromOMDB(ctx context.Context, localShow *show.Show) {
	if localShow.IMDBID == nil || *localShow.IMDBID == "" {
		return
	}
	detail, err := s.omdb.GetByIMDBID(ctx, *localShow.IMDBID)
	if err != nil {
		s.logger.Warn("Failed to enrich with OMDB", "imdb_id", *localShow.IMDBID, "error", err)
		return
	}
	ratings := map[string]interface{}{
		"imdb_rating": detail.ImdbRating, "imdb_votes": detail.ImdbVotes,
		"metascore": detail.Metascore, "rated": detail.Rated, "awards": detail.Awards,
		"director": detail.Director, "actors": detail.Actors, "source": "omdb",
		"enriched_at": time.Now().Format(time.RFC3339), "rotten_tomatoes": "",
	}
	for _, rating := range detail.Ratings {
		if rating.Source == "Rotten Tomatoes" {
			ratings["rotten_tomatoes"] = rating.Value
			break
		}
	}
	encoded, err := json.Marshal(ratings)
	if err == nil {
		localShow.Ratings = datatypes.JSON(encoded)
	}
}

func (s *Syncer) queueNotifications(event *timeline.TimelineEvent) {
	tracks, err := s.alertRepo.GetUsersTrackingShow(event.ShowID)
	if err != nil {
		s.logger.Error("Failed to find notification recipients", "event_id", event.ID, "error", err)
		return
	}
	for _, track := range tracks {
		if err := s.queueNotification(event, &track); err != nil {
			s.logger.Error("Failed to queue notification", "event_id", event.ID, "user_id", track.UserID, "error", err)
		}
	}
}

func (s *Syncer) QueueShowNotifications(ctx context.Context, userID, showID uuid.UUID) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	track, err := s.alertRepo.FindByUserAndShow(userID, showID)
	if err != nil {
		return err
	}
	events, err := s.timelineRepo.GetShowUpcomingEvents(showID, time.Now())
	if err != nil {
		return err
	}
	for i := range events {
		if err := s.queueNotification(&events[i], track); err != nil {
			return err
		}
	}
	return nil
}

func (s *Syncer) queueNotification(event *timeline.TimelineEvent, track *alert.UserTrackedShow) error {
	shouldNotify := track.NotifyNewEpisode
	if event.EventType == "season_premiere" || event.EventType == "series_premiere" {
		shouldNotify = track.NotifyNewSeason
	}
	if event.EventType == "status_change" {
		shouldNotify = track.NotifyStatusChange
	}
	if !shouldNotify {
		return nil
	}
	scheduledFor := event.EventDate.Add(-time.Duration(track.NotifyHoursBefore) * time.Hour)
	if scheduledFor.Before(time.Now()) {
		scheduledFor = time.Now()
	}
	payload, _ := json.Marshal(map[string]string{
		"event_id": event.ID.String(), "show_id": event.ShowID.String(), "type": event.EventType,
	})
	return s.notifRepo.Create(&notification.Notification{
		UserID: track.UserID, TimelineEventID: &event.ID, Title: event.Title,
		Body: "A release you track is coming up.", Payload: datatypes.JSON(payload),
		Status: "pending", ScheduledFor: scheduledFor,
	})
}

func (s *Syncer) backfillAirDates(ctx context.Context, tvdbID int, episodes []*show.Episode) error {
	s.logger.Info("Backfilling air dates from TheTVDB", "tvdb_id", tvdbID, "count", len(episodes))

	resp, err := s.thetvdb.GetSeriesEpisodes(ctx, tvdbID, "default", "eng")
	if err != nil {
		return err
	}

	// Map: "S{season}E{episode}" -> AirDate string
	dateMap := make(map[string]string)
	for _, ep := range resp.Data.Episodes {
		key := fmt.Sprintf("S%dE%d", ep.Season, ep.Number)
		dateMap[key] = ep.Aired
	}

	for _, ep := range episodes {
		key := fmt.Sprintf("S%dE%d", ep.SeasonNumber, ep.EpisodeNumber)
		if dateStr, ok := dateMap[key]; ok && dateStr != "" {
			if t, err := time.Parse("2006-01-02", dateStr); err == nil {
				ep.AirDate = &t
				// Update in DB
				s.showRepo.UpsertEpisode(ep)

				// Check if we should generate timeline event now
				if ep.AirDate.After(time.Now()) {
					// We need the season object here, but we don't have it easily.
					// Simplified: Skip timeline event for backfilled episodes to avoid complexity or duplicate query
					// Or fetch season? Let's just update the DB for now.
				}
			}
		}
	}
	return nil
}

func parseDate(dateStr string) *time.Time {
	if dateStr == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil
	}
	return &t
}
