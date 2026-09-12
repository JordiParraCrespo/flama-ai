# syntax=docker/dockerfile:1
FROM golang:1.24-alpine AS builder
WORKDIR /src
ARG VERSION=dev
COPY apps/runner/go.mod apps/runner/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY apps/runner/ ./
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -trimpath \
      -ldflags="-s -w -X main.version=${VERSION}" \
      -o /out/runner ./cmd/server

# Distroless: no shell, no package manager, non-root by default. The binary
# is static, so nothing else is needed.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /out/runner /runner
ENV RUNNER_ENV=production
EXPOSE 3006
USER nonroot:nonroot
ENTRYPOINT ["/runner"]
