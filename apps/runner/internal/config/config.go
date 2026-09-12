// Package config reads the process configuration from the environment.
//
// The rules match `.agents/rules/api-config.md`: one `.env` at the repo
// root documents everything; real environment variables win; a required
// secret missing fails boot; an optional capability missing disables the
// capability and is reported, never sentinel-defaulted.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Env is the deployment mode.
type Env string

const (
	Development Env = "development"
	Production  Env = "production"
	Test        Env = "test"
)

// Config is the fully parsed, validated configuration.
type Config struct {
	Env     Env
	Port    int
	Version string

	LogLevel  string
	LogFormat string

	// TrustProxy is the number of reverse-proxy hops in front of the service.
	TrustProxy int
	// ErrorTypeBaseURL is the base of RFC 7807 `type` URIs, shared with the API.
	ErrorTypeBaseURL string
	ShutdownTimeout  time.Duration
	// MaxBodyBytes caps JSON request bodies.
	MaxBodyBytes int64

	// BootstrapAPIKey is the one key that exists before any is issued. It
	// holds every scope; use it to mint narrower keys, then keep it in a vault.
	BootstrapAPIKey string

	// JWT is present when service tokens are enabled. Nil disables the
	// service-token verifier and issuing endpoint; /capabilities says so.
	JWT *JWTConfig

	// Jobs tunes the example bounded context.
	Jobs JobsConfig
}

// JWTConfig is the optional service-token capability.
type JWTConfig struct {
	Secret   []byte
	Issuer   string
	Audience string
	TTL      time.Duration
}

// JobsConfig tunes the worker pool.
type JobsConfig struct {
	Workers int
	// QueueSize bounds queued-but-not-running jobs; beyond it Submit returns 429.
	QueueSize int
}

// Load resolves configuration. Outside production it also applies the root
// `.env`, located by walking up from the working directory.
func Load() (*Config, error) {
	if env := Env(getenv("RUNNER_ENV", string(Development))); env != Production {
		if cwd, err := os.Getwd(); err == nil {
			if root, ok := findWorkspaceRoot(cwd); ok {
				if err := loadDotenv(root); err != nil {
					return nil, fmt.Errorf("load .env: %w", err)
				}
			}
		}
	}
	return Parse(os.LookupEnv)
}

// Parse builds a Config from a lookup function so tests never touch the
// process environment.
func Parse(lookup func(string) (string, bool)) (*Config, error) {
	get := func(key, def string) string {
		if v, ok := lookup(key); ok && strings.TrimSpace(v) != "" {
			return v
		}
		return def
	}
	var errs []error

	cfg := &Config{
		Env:              Env(get("RUNNER_ENV", string(Development))),
		Version:          get("RUNNER_VERSION", "dev"),
		LogLevel:         get("RUNNER_LOG_LEVEL", "info"),
		ErrorTypeBaseURL: get("ERROR_TYPE_BASE_URL", "https://flama.dev/errors"),
		BootstrapAPIKey:  get("RUNNER_BOOTSTRAP_API_KEY", ""),
	}
	switch cfg.Env {
	case Development, Production, Test:
	default:
		errs = append(errs, fmt.Errorf("RUNNER_ENV must be development, production or test, got %q", cfg.Env))
	}
	defaultFormat := "text"
	if cfg.Env == Production {
		defaultFormat = "json"
	}
	cfg.LogFormat = get("RUNNER_LOG_FORMAT", defaultFormat)

	cfg.Port = parseInt(get("RUNNER_PORT", "3006"), "RUNNER_PORT", &errs)
	cfg.TrustProxy = parseInt(get("RUNNER_TRUST_PROXY", "0"), "RUNNER_TRUST_PROXY", &errs)
	cfg.ShutdownTimeout = parseDuration(get("RUNNER_SHUTDOWN_TIMEOUT", "15s"), "RUNNER_SHUTDOWN_TIMEOUT", &errs)
	cfg.MaxBodyBytes = int64(parseInt(get("RUNNER_MAX_BODY_BYTES", "1048576"), "RUNNER_MAX_BODY_BYTES", &errs))
	cfg.Jobs.Workers = parseInt(get("RUNNER_JOB_WORKERS", "4"), "RUNNER_JOB_WORKERS", &errs)
	cfg.Jobs.QueueSize = parseInt(get("RUNNER_JOB_QUEUE_SIZE", "1024"), "RUNNER_JOB_QUEUE_SIZE", &errs)

	if len(cfg.BootstrapAPIKey) < 32 {
		errs = append(errs, errors.New("RUNNER_BOOTSTRAP_API_KEY is required and must be at least 32 characters (openssl rand -base64 32)"))
	}

	if secret := get("RUNNER_JWT_SECRET", ""); secret != "" {
		if len(secret) < 32 {
			errs = append(errs, errors.New("RUNNER_JWT_SECRET must be at least 32 characters"))
		}
		cfg.JWT = &JWTConfig{
			Secret:   []byte(secret),
			Issuer:   get("RUNNER_JWT_ISSUER", "flama-runner"),
			Audience: get("RUNNER_JWT_AUDIENCE", "flama-runner"),
			TTL:      parseDuration(get("RUNNER_JWT_TTL", "1h"), "RUNNER_JWT_TTL", &errs),
		}
	}

	if len(errs) > 0 {
		return nil, errors.Join(errs...)
	}
	return cfg, nil
}

// Addr is the listen address.
func (c *Config) Addr() string { return ":" + strconv.Itoa(c.Port) }

// IsProduction reports the production mode.
func (c *Config) IsProduction() bool { return c.Env == Production }

func getenv(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

func parseInt(raw, key string, errs *[]error) int {
	n, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || n < 0 {
		*errs = append(*errs, fmt.Errorf("%s must be a non-negative integer, got %q", key, raw))
	}
	return n
}

func parseDuration(raw, key string, errs *[]error) time.Duration {
	d, err := time.ParseDuration(strings.TrimSpace(raw))
	if err != nil || d <= 0 {
		*errs = append(*errs, fmt.Errorf("%s must be a positive duration like 30s, got %q", key, raw))
	}
	return d
}
