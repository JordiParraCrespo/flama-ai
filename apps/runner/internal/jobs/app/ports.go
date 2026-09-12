// Package app holds the job use cases, the worker pool and the ports.
package app

import (
	"context"
	"errors"

	"github.com/jordiparracrespo/flama-ai/apps/runner/internal/jobs/domain"
)

// ErrNotFound is what a Repository returns for an unknown id.
var ErrNotFound = errors.New("job not found")

// ListFilter narrows List.
type ListFilter struct {
	Status *domain.Status
	Limit  int
}

// Repository is the persistence port.
type Repository interface {
	Save(ctx context.Context, job domain.Job) error
	FindByID(ctx context.Context, id string) (domain.Job, error)
	List(ctx context.Context, filter ListFilter) ([]domain.Job, error)
}

// Runner executes one kind of job. Registered per kind; the payload it
// receives is whatever the submitter sent.
type Runner interface {
	Run(ctx context.Context, job domain.Job) error
}

// RunnerFunc adapts a function to Runner.
type RunnerFunc func(ctx context.Context, job domain.Job) error

func (f RunnerFunc) Run(ctx context.Context, job domain.Job) error { return f(ctx, job) }

// Publisher is the outbound event port; the WebSocket adapter implements it.
type Publisher interface {
	Publish(ctx context.Context, event domain.Event)
}

// PublisherFunc adapts a function to Publisher.
type PublisherFunc func(ctx context.Context, event domain.Event)

func (f PublisherFunc) Publish(ctx context.Context, event domain.Event) { f(ctx, event) }

// IDGenerator mints job ids.
type IDGenerator func() string
