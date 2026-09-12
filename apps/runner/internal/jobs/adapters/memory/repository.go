// Package memory is the in-process job store.
package memory

import (
	"context"
	"sort"
	"sync"

	"github.com/jordiparracrespo/flama-ai/apps/runner/internal/jobs/app"
	"github.com/jordiparracrespo/flama-ai/apps/runner/internal/jobs/domain"
)

// Repository stores jobs in a map.
type Repository struct {
	mu   sync.RWMutex
	jobs map[string]domain.Job
}

// New builds an empty repository.
func New() *Repository { return &Repository{jobs: map[string]domain.Job{}} }

var _ app.Repository = (*Repository)(nil)

func (r *Repository) Save(_ context.Context, job domain.Job) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.jobs[job.ID] = job
	return nil
}

func (r *Repository) FindByID(_ context.Context, id string) (domain.Job, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	job, ok := r.jobs[id]
	if !ok {
		return domain.Job{}, app.ErrNotFound
	}
	return job, nil
}

func (r *Repository) List(_ context.Context, f app.ListFilter) ([]domain.Job, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]domain.Job, 0, len(r.jobs))
	for _, j := range r.jobs {
		if f.Status != nil && j.Status != *f.Status {
			continue
		}
		out = append(out, j)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	if f.Limit > 0 && len(out) > f.Limit {
		out = out[:f.Limit]
	}
	return out, nil
}
