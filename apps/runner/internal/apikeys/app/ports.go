// Package app holds the API-key use cases and the ports they need.
package app

import (
	"context"
	"errors"
	"time"

	"github.com/jordiparracrespo/flama-ai/apps/runner/internal/apikeys/domain"
	"github.com/jordiparracrespo/flama-ai/apps/runner/internal/scopes"
)

// ErrNotFound is what a Repository returns for an unknown id; the use case
// maps it to the catalog problem.
var ErrNotFound = errors.New("api key not found")

// Repository is the persistence port.
type Repository interface {
	Save(ctx context.Context, key domain.Key) error
	FindByID(ctx context.Context, id string) (domain.Key, error)
	List(ctx context.Context) ([]domain.Key, error)
}

// TokenIssuer mints service JWTs. Nil in the service means the capability
// is off.
type TokenIssuer interface {
	Issue(subject, name string, granted scopes.Set, ttl time.Duration, now time.Time) (string, error)
}

// Clock is injectable time.
type Clock func() time.Time
