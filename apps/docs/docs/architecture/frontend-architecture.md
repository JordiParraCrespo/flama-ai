---
sidebar_position: 2
---

# Frontend Architecture

The `packages/frontend` package implements a clean architecture pattern shared between web and mobile.

## Layers

### Domain

Pure business logic with no framework dependencies:

- **Entities**: `UserEntity`, etc.
- **Repository interfaces**: `IAuthRepository`, `IUserRepository`
- **Service interfaces**: `IStorageService`

### Presentation

UI-agnostic state management:

- **Stores**: Zustand vanilla stores (framework-agnostic)
- **View Models**: Orchestrate use cases, manage store state

### Data Access

Concrete implementations:

- **Repositories**: API calls via `@flama/api-client`
- **Services**: Platform-specific (localStorage on web, SecureStore on mobile)

## Dependency Injection

InversifyJS wires everything together. Each app (web/mobile) binds its own implementations:

```typescript
import { container, TOKENS } from "@flama/frontend/di";
import { AuthRepositoryImpl } from "@flama/frontend";

// Bind platform-specific storage
container.bind(TOKENS.StorageService).to(WebStorageService);

// Bind shared implementations
container.bind(TOKENS.AuthRepository).to(AuthRepositoryImpl);
```

## Server state

Server state is handled with TanStack Query. Query keys follow a colocated
**query key factory** pattern — see [React Query Keys](./query-keys.md).
