module github.com/jordiparracrespo/flama-ai/packages/go/ws

go 1.24

require (
	github.com/coder/websocket v1.8.15
	github.com/jordiparracrespo/flama-ai/packages/go/auth v0.0.0
	github.com/jordiparracrespo/flama-ai/packages/go/core v0.0.0
)

require (
	github.com/golang-jwt/jwt/v5 v5.3.1 // indirect
	github.com/jordiparracrespo/flama-ai/packages/go/httpx v0.0.0 // indirect
)

// Relative replaces keep the module tidy-able and buildable without go.work.
replace (
	github.com/jordiparracrespo/flama-ai/packages/go/auth => ../auth
	github.com/jordiparracrespo/flama-ai/packages/go/core => ../core
	github.com/jordiparracrespo/flama-ai/packages/go/httpx => ../httpx
)
