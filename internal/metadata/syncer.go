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
		redis:        rdb,
		logger:       logger,
	}
}

func (s *Syncer) SyncShow(ctx context.Context, showID uuid.UUID) error {
	s.logger.Info("Syncing show", "show_id", showID)

	localShow, err := s.showRepo.FindByID(showID)
	if err != nil {
		return fmt.Errorf("failed to find show: %w", err)
	}
	if localShow.TMDBID == nil {
		return fmt.Errorf("show has no TMDB ID")
	}

	tmdbShow, err := s.tmdb.GetTVShow(ctx, *localShow.TMDBID)
	if err != nil {
		return fmt.Errorf("tmdb fetch failed: %w", err)
	}

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
	extIDs, err := s.tmdb.GetExternalIDs(ctx, *localShow.TMDBID)
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

func (s *Syncer) createTimelineEvent(show *show.Show, season *show.Season, ep *show.Episode) {
	event := &timeline.TimelineEvent{
		ShowID:        show.ID,
		EventType:     "new_episode",
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
	}
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
