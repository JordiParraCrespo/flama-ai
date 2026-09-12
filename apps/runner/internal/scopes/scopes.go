// Package scopes is this service's credential scope catalog.
//
// It follows the convention of packages/shared/src/scopes: a scope is
// `<resource>:<level>`, `write` implies `read`, and every route and every
// credential is described in these terms. The catalog is separate from the
// API's because the resources differ — this service knows about jobs and its
// own keys, not organizations — but the vocabulary is the same, so a NestJS
// caller reasons about both with one mental model.
package scopes

import (
	"fmt"
	"sort"
	"strings"
)

// Level is read or write.
type Level string

const (
	Read  Level = "read"
	Write Level = "write"
)

// Resource is what a scope governs.
type Resource string

const (
	Jobs   Resource = "jobs"
	Keys   Resource = "keys"
	Events Resource = "events"
)

// Scope is a `resource:level` string.
type Scope string

// Catalog entries. Adding a resource here is the only step needed for it to
// be grantable on a key and checkable on a route.
const (
	JobsRead   Scope = "jobs:read"
	JobsWrite  Scope = "jobs:write"
	KeysRead   Scope = "keys:read"
	KeysWrite  Scope = "keys:write"
	EventsRead Scope = "events:read"
)

var catalog = map[Scope]struct{}{
	JobsRead: {}, JobsWrite: {}, KeysRead: {}, KeysWrite: {}, EventsRead: {},
}

// All lists every scope, sorted, for capability listings and bootstrap keys.
func All() []Scope {
	out := make([]Scope, 0, len(catalog))
	for s := range catalog {
		out = append(out, s)
	}
	sort.Slice(out, func(i, j int) bool { return out[i] < out[j] })
	return out
}

// Parse validates a scope string against the catalog.
func Parse(s string) (Scope, error) {
	sc := Scope(strings.TrimSpace(s))
	if _, ok := catalog[sc]; !ok {
		return "", fmt.Errorf("unknown scope %q", s)
	}
	return sc, nil
}

// ParseAll validates a list, deduplicating it.
func ParseAll(in []string) ([]Scope, error) {
	seen := map[Scope]struct{}{}
	out := make([]Scope, 0, len(in))
	for _, s := range in {
		sc, err := Parse(s)
		if err != nil {
			return nil, err
		}
		if _, dup := seen[sc]; dup {
			continue
		}
		seen[sc] = struct{}{}
		out = append(out, sc)
	}
	return out, nil
}

func (s Scope) split() (Resource, Level) {
	res, lvl, _ := strings.Cut(string(s), ":")
	return Resource(res), Level(lvl)
}

// Set is a granted scope set with implication rules baked in.
type Set map[Scope]struct{}

// NewSet builds a set from granted scopes.
func NewSet(granted ...Scope) Set {
	s := Set{}
	for _, g := range granted {
		s[g] = struct{}{}
	}
	return s
}

// Has reports whether the set satisfies the required scope. `write` on a
// resource satisfies `read` on the same resource (mirrors expandScopes).
func (s Set) Has(required Scope) bool {
	if _, ok := s[required]; ok {
		return true
	}
	res, lvl := required.split()
	if lvl == Read {
		_, ok := s[Scope(string(res)+":"+string(Write))]
		return ok
	}
	return false
}

// HasAll reports whether every required scope is satisfied.
func (s Set) HasAll(required ...Scope) bool {
	for _, r := range required {
		if !s.Has(r) {
			return false
		}
	}
	return true
}

// Missing lists the required scopes the set does not satisfy, for the
// forbidden problem's detail.
func (s Set) Missing(required ...Scope) []Scope {
	var out []Scope
	for _, r := range required {
		if !s.Has(r) {
			out = append(out, r)
		}
	}
	return out
}

// Strings renders the set sorted, for JSON and JWT claims.
func (s Set) Strings() []string {
	out := make([]string, 0, len(s))
	for sc := range s {
		out = append(out, string(sc))
	}
	sort.Strings(out)
	return out
}
