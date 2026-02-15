package metadata

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/tashifkhan/bingebeacon/internal/alert"
	"github.com/tashifkhan/bingebeacon/internal/metadata/omdb"
	"github.com/tashifkhan/bingebeacon/internal/metadata/tmdb"
	"github.com/tashifkhan/bingebeacon/internal/show"
	"github.com/tashifkhan/bingebeacon/internal/timeline"
	"gorm.io/datatypes"
)

type Syncer struct {
	tmdb         *tmdb.Client
	omdb         *omdb.Client
	showRepo     *show.Repository
	alertRepo    *alert.Repository
	timelineRepo *timeline.Repository
	logger       *slog.Logger
}

func NewSyncer(
	tmdb *tmdb.Client,
	omdb *omdb.Client,
	showRepo *show.Repository,
	alertRepo *alert.Repository,
	timelineRepo *timeline.Repository,
	logger *slog.Logger,
) *Syncer {
	return &Syncer{
		tmdb:         tmdb,
		omdb:         omdb,
		showRepo:     showRepo,
		alertRepo:    alertRepo,
		timelineRepo: timelineRepo,
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

	if err := s.showRepo.UpsertFromTMDB(localShow); err != nil {
		return fmt.Errorf("failed to update show: %w", err)
	}

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

			created, err := s.showRepo.UpsertEpisode(ep)
			if err != nil {
				s.logger.Error("Failed to upsert episode", "ep", ep.EpisodeNumber, "error", err)
				continue
			}

			if created && ep.AirDate != nil && ep.AirDate.After(time.Now()) {
				// New upcoming episode -> Generate Timeline Event
				event := &timeline.TimelineEvent{
					ShowID:        localShow.ID,
					EventType:     "new_episode",
					Title:         fmt.Sprintf("%s - S%02dE%02d", localShow.Title, season.SeasonNumber, ep.EpisodeNumber),
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
