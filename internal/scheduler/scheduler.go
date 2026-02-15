package scheduler

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

type Job struct {
	Name     string
	Interval time.Duration
	Run      func(ctx context.Context) error
}

type Scheduler struct {
	jobs   []Job
	logger *slog.Logger
	wg     sync.WaitGroup
	stop   chan struct{}
}

func NewScheduler(logger *slog.Logger) *Scheduler {
	return &Scheduler{
		jobs:   make([]Job, 0),
		logger: logger,
		stop:   make(chan struct{}),
	}
}

func (s *Scheduler) Register(job Job) {
	s.jobs = append(s.jobs, job)
}

func (s *Scheduler) Start() {
	s.logger.Info("Starting scheduler", "job_count", len(s.jobs))
	for _, job := range s.jobs {
		s.wg.Add(1)
		go s.runJob(job)
	}
}

func (s *Scheduler) Stop() {
	s.logger.Info("Stopping scheduler...")
	close(s.stop)
	s.wg.Wait()
	s.logger.Info("Scheduler stopped")
}

func (s *Scheduler) runJob(job Job) {
	defer s.wg.Done()

	s.logger.Info("Job started", "name", job.Name, "interval", job.Interval)

	// Initial run? Or wait for first interval?
	// Usually wait first. If we want immediate run, logic differs.
	// For periodic sync, wait is fine.

	ticker := time.NewTicker(job.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-s.stop:
			s.logger.Info("Job stopped", "name", job.Name)
			return
		case <-ticker.C:
			s.executeJob(job)
		}
	}
}

func (s *Scheduler) executeJob(job Job) {
	s.logger.Info("Executing job", "name", job.Name)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute) // Long timeout for sync
	defer cancel()

	defer func() {
		if r := recover(); r != nil {
			s.logger.Error("Job panicked", "name", job.Name, "error", r)
		}
	}()

	if err := job.Run(ctx); err != nil {
		s.logger.Error("Job failed", "name", job.Name, "error", err)
	} else {
		s.logger.Info("Job completed successfully", "name", job.Name)
	}
}
