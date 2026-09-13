module github.com/jordiparracrespo/flama-ai/packages/go/auth

go 1.24

require (
	github.com/golang-jwt/jwt/v5 v5.3.1
	github.com/jordiparracrespo/flama-ai/packages/go/core v0.0.0
	github.com/jordiparracrespo/flama-ai/packages/go/httpx v0.0.0
)

// Relative replaces keep the module tidy-able and buildable without go.work.
replace (
	github.com/jordiparracrespo/flama-ai/packages/go/core => ../core
	github.com/jordiparracrespo/flama-ai/packages/go/httpx => ../httpx
)
