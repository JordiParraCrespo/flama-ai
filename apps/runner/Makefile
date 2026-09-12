# Contributor entrypoints. `pnpm --filter @flama/runner <script>` calls these
# so Turborepo can orchestrate the Go app like the Node ones.
GO      ?= go
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
LDFLAGS := -s -w -X main.version=$(VERSION)

.PHONY: build dev run lint test test-race vet tidy clean

build:
	CGO_ENABLED=0 $(GO) build -trimpath -ldflags "$(LDFLAGS)" -o dist/runner ./cmd/server

dev run:
	$(GO) run ./cmd/server

lint:
	golangci-lint run ./...

vet:
	$(GO) vet ./...

test:
	$(GO) test ./...

test-race:
	$(GO) test -race -count=1 ./...

tidy:
	$(GO) mod tidy

clean:
	rm -rf dist
