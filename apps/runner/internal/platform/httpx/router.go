// Package httpx is the thin HTTP toolkit every adapter builds on: a router
// over the standard library mux with middleware groups, a handler type that
// returns errors, JSON helpers, and the cross-cutting middleware chain.
//
// It deliberately stays on net/http. Go 1.22 gave the standard mux method
// matching and path parameters, which removed the reason to reach for a
// framework; keeping handlers as plain http.Handler keeps every adapter
// testable with httptest and every third-party middleware compatible.
package httpx

import (
	"net/http"

	"github.com/jordiparracrespo/flama-ai/apps/runner/internal/platform/problem"
)

// Middleware wraps a handler.
type Middleware func(http.Handler) http.Handler

// HandlerFunc is an http handler that reports failures by returning them.
// The router turns the error into a problem document, so handlers never
// write error bodies by hand and never forget the content type.
type HandlerFunc func(w http.ResponseWriter, r *http.Request) error

// Router registers HandlerFuncs on a standard mux with a middleware stack.
// Groups share the parent's stack and add their own — the pattern chi users
// know, on the stdlib mux.
type Router struct {
	mux        *http.ServeMux
	problems   *problem.Writer
	middleware []Middleware
}

// NewRouter builds a router whose handlers report errors through problems.
func NewRouter(problems *problem.Writer) *Router {
	return &Router{mux: http.NewServeMux(), problems: problems}
}

// Use appends middleware applied to every route registered afterwards on
// this router or its groups.
func (r *Router) Use(mw ...Middleware) {
	r.middleware = append(r.middleware, mw...)
}

// Group runs fn with a child router that inherits the current stack. Routes
// the child registers land on the same mux.
func (r *Router) Group(fn func(g *Router)) {
	child := &Router{
		mux:        r.mux,
		problems:   r.problems,
		middleware: append([]Middleware(nil), r.middleware...),
	}
	fn(child)
}

// Handle registers a standard handler on a `METHOD /pattern` route.
func (r *Router) Handle(pattern string, h http.Handler) {
	r.mux.Handle(pattern, Chain(h, r.middleware...))
}

// HandleFunc registers an error-returning handler.
func (r *Router) HandleFunc(pattern string, h HandlerFunc) {
	r.Handle(pattern, r.Wrap(h))
}

// Wrap adapts a HandlerFunc to http.Handler, writing returned errors as
// problem documents.
func (r *Router) Wrap(h HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		if err := h(w, req); err != nil {
			r.problems.Write(w, req, err)
		}
	})
}

// ServeHTTP makes the router a handler.
func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	r.mux.ServeHTTP(w, req)
}

// Chain applies middleware so the first listed runs outermost.
func Chain(h http.Handler, mw ...Middleware) http.Handler {
	for i := len(mw) - 1; i >= 0; i-- {
		h = mw[i](h)
	}
	return h
}
