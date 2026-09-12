package ws

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"

	"github.com/jordiparracrespo/flama-ai/packages/go/auth"
	"github.com/jordiparracrespo/flama-ai/packages/go/auth/scope"
	"github.com/jordiparracrespo/flama-ai/packages/go/core/problem"
)

func TestSubscribeAndPublish(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	hub := NewHub(logger, DefaultOptions())
	principal := &auth.Principal{ID: "k1", Kind: auth.KindAPIKey, Scopes: scope.NewSet(scope.Scope("events:read"))}

	authorize := func(_ context.Context, p *auth.Principal, topic string) error {
		if !strings.HasPrefix(topic, "jobs") {
			return problem.ErrForbidden.WithDetail("topic %s", topic)
		}
		return nil
	}
	handler := Handler(hub, &problem.Writer{}, logger, authorize)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handler.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	}))
	defer srv.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c, _, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(srv.URL, "http"), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer c.CloseNow()

	var hello Envelope
	if err := wsjson.Read(ctx, c, &hello); err != nil || hello.Type != TypeHello {
		t.Fatalf("hello: %+v %v", hello, err)
	}

	// Forbidden topic is rejected as a whole.
	_ = wsjson.Write(ctx, c, Envelope{Type: TypeSubscribe, ID: "1", Topics: []string{"secrets"}})
	var rej Envelope
	_ = wsjson.Read(ctx, c, &rej)
	if rej.Type != TypeError || rej.ID != "1" || rej.Error.Code != "RUNNER_003" {
		t.Fatalf("expected forbidden error, got %+v", rej)
	}

	_ = wsjson.Write(ctx, c, Envelope{Type: TypeSubscribe, ID: "2", Topics: []string{"jobs"}})
	var ack Envelope
	_ = wsjson.Read(ctx, c, &ack)
	if ack.Type != TypeSubscribed || ack.ID != "2" {
		t.Fatalf("ack: %+v", ack)
	}

	hub.Publish("jobs", "job.updated", map[string]string{"id": "j1"})
	hub.Publish("other", "ignored", nil)
	var ev Envelope
	if err := wsjson.Read(ctx, c, &ev); err != nil {
		t.Fatal(err)
	}
	if ev.Type != TypeEvent || ev.Topic != "jobs" || ev.Event != "job.updated" || string(ev.Payload) != `{"id":"j1"}` {
		t.Fatalf("event: %+v", ev)
	}

	if hub.Len() != 1 {
		t.Fatalf("len = %d", hub.Len())
	}
	closed := make(chan error, 1)
	go func() {
		var e Envelope
		closed <- wsjson.Read(ctx, c, &e)
	}()
	hub.Close(ctx)
	if hub.Len() != 0 {
		t.Fatalf("len after close = %d", hub.Len())
	}
	if err := <-closed; websocket.CloseStatus(err) != websocket.StatusGoingAway {
		t.Fatalf("client should see going-away, got %v", err)
	}
}

func TestUnauthenticatedUpgradeIsRefused(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	handler := Handler(NewHub(logger, DefaultOptions()), &problem.Writer{}, logger, nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/v1/ws", nil))
	if rec.Code != 401 {
		t.Fatalf("code = %d", rec.Code)
	}
}
