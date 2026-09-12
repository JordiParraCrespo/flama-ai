module github.com/jordiparracrespo/flama-ai/apps/runner

go 1.24

require (
	github.com/coder/websocket v1.8.15
	github.com/jordiparracrespo/flama-ai/packages/go/auth v0.0.0
	github.com/jordiparracrespo/flama-ai/packages/go/config v0.0.0
	github.com/jordiparracrespo/flama-ai/packages/go/core v0.0.0
	github.com/jordiparracrespo/flama-ai/packages/go/health v0.0.0
	github.com/jordiparracrespo/flama-ai/packages/go/httpx v0.0.0
	github.com/jordiparracrespo/flama-ai/packages/go/ws v0.0.0
)

require github.com/golang-jwt/jwt/v5 v5.3.1 // indirect

replace (
	github.com/jordiparracrespo/flama-ai/packages/go/auth => ../../packages/go/auth
	github.com/jordiparracrespo/flama-ai/packages/go/config => ../../packages/go/config
	github.com/jordiparracrespo/flama-ai/packages/go/core => ../../packages/go/core
	github.com/jordiparracrespo/flama-ai/packages/go/health => ../../packages/go/health
	github.com/jordiparracrespo/flama-ai/packages/go/httpx => ../../packages/go/httpx
	github.com/jordiparracrespo/flama-ai/packages/go/ws => ../../packages/go/ws
)
