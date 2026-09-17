/**
 * Architecture fitness rules for the Domain-Driven Hexagon layout.
 * See ARCHITECTURE.md. Run with: pnpm --filter @flama/api arch
 *
 * These rules police the *direction* of dependencies. The shape of a module —
 * which directories exist and what a file in each may be called — is policed
 * by `scripts/check-api-structure.mjs` (`pnpm check:api-structure`). The two
 * are meant to be read together: the structure check says where a file lives,
 * this says what it is then allowed to know about.
 *
 * Where a rule carries a `pathNot` exception naming specific files, that is a
 * ledger entry, not a carve-out: the file is a known violation waiting on a
 * refactor, and the comment says which. Adding a name to one of those lists
 * needs the same scrutiny as deleting the rule.
 */

/**
 * A spec asserts on the thing it tests, and some of them (the route-policy and
 * error-catalog sweeps) deliberately enumerate every controller in the app.
 * Tests are held to the structure contract, not to the dependency direction.
 */
const TESTS = ['\\.spec\\.ts$', '^src/[^/]+/__tests__/', '^src/__tests__/'];

/**
 * What one module may reach for in another. Anything else — a handler, a
 * controller, a concrete adapter, a mapper — is that module's own business.
 */
const CROSS_MODULE_PUBLIC_SURFACE = [
  '^src/config/', // not a module: the composition root's configuration
  // `roles` is @Global precisely so its AbilityFactory is the app's one
  // answer to "what may this principal do". Guards in `auth` and handlers
  // that check grantability ask it by design; it is published surface.
  '^src/roles/application/ability\\.factory\\.ts$',
  '\\.di-tokens\\.ts$', // the token a port is bound to
  '\\.repository\\.port\\.ts$', // the port itself
  '^src/[^/]+/infrastructure/[^/]+\\.port\\.ts$', // ports for non-database adapters
  '^src/[^/]+/domain/', // entities, value objects, events, errors
  '^src/[^/]+/dtos/', // the response contracts it publishes
  '\\.(command|query)\\.ts$', // a bus message, to dispatch it
  '^src/[^/]+/(guards|decorators|interceptors)/', // the inbound adapters it offers
  '\\.resource\\.ts$', // the CASL resource it owns
  '\\.orm-entity\\.ts$', // covered, more tightly, by orm-entity-stays-in-database
  '^src/auth/infrastructure/', // the configured Better Auth instance and its helpers
  '^src/[^/]+/[^/]+\\.module\\.ts$', // module wiring imports module wiring
  // Ledger: two application-layer resolvers another module injects directly.
  // Each wants a port on the consuming side — the throttler needs "what
  // credential is this", the email processor needs "what locale does this
  // user read" — and neither should know which module answers it.
  '^src/auth/application/credential-scope\\.resolver\\.ts$',
  '^src/profile/application/locale\\.resolver\\.ts$',
];

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Circular dependencies make the graph impossible to reason about.',
      severity: 'error',
      from: { path: '^src/' },
      to: { circular: true },
    },
    {
      name: 'domain-stays-pure',
      comment:
        'The domain layer may only depend on @flama/backend-ddd, @flama/backend-authz, @flama/shared and node core. No NestJS, TypeORM, oxide.ts, @flama/backend-core, or any other infrastructure.',
      severity: 'error',
      from: { path: '^src/[^/]+/domain/' },
      to: {
        // Ignore node built-ins; flag everything else that is not an allowed
        // workspace package or another domain file in the same layer.
        dependencyTypesNot: ['core'],
        pathNot: ['^src/[^/]+/domain/', 'packages/(backend/ddd|backend/authz|shared)/'],
      },
    },
    {
      name: 'domain-no-outward-imports',
      comment:
        'The domain must not depend on its own outer layers. It is the centre: everything else may look in, it looks at nothing.',
      severity: 'error',
      from: { path: '^src/([^/]+)/domain/' },
      to: {
        path: '^src/$1/(database|infrastructure|commands|queries|application|dtos|guards|decorators|interceptors)/',
      },
    },
    {
      name: 'handlers-depend-on-port-not-adapter',
      comment:
        'Application and interface layers depend on the port, never on the concrete adapter (*.repository.ts, *.adapter.ts, *.gateway.ts). The adapter is chosen once, in the module.',
      severity: 'error',
      from: {
        path: '^src/[^/]+/(commands|queries|application)/',
        pathNot: TESTS,
      },
      to: {
        path: '\\.(repository|adapter|gateway)\\.ts$',
        // Ledger: profile's avatar store and its Better Auth façade are
        // injected as concrete classes. Both need a *.port.ts and a DI token
        // before this list can go.
        pathNot: [
          '\\.port\\.ts$',
          '^src/profile/infrastructure/avatar-storage\\.adapter\\.ts$',
          '^src/profile/infrastructure/profile-auth\\.gateway\\.ts$',
          '^src/auth/infrastructure/delegated-session\\.adapter\\.ts$',
        ],
      },
    },
    {
      name: 'controllers-go-through-the-bus',
      comment:
        'An HTTP controller translates a request into a command or query and maps the result back. It does not reach for persistence — no repository, no port, no ORM model. If it needs data, it dispatches for it.',
      severity: 'error',
      from: { path: '\\.http\\.controller\\.ts$' },
      to: {
        path: '^src/[^/]+/database/',
        // A read model's shape may be named in a signature; what a controller
        // may not do is call persistence. Only runtime edges are the offence.
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'orm-entity-stays-in-database',
      comment:
        'TypeORM persistence models (*.orm-entity.ts) belong to the database layer. Outer layers use the domain entity instead. (The mapper and module wiring are exempt.)',
      severity: 'error',
      from: {
        path: '^src/[^/]+/(domain|commands|queries|dtos)/',
      },
      to: { path: '\\.orm-entity\\.ts$' },
    },
    {
      name: 'typeorm-stays-in-the-adapters',
      comment:
        'TypeORM is a detail of the persistence adapter. Everything inside it — including application-layer policies and resolvers — asks a repository port instead, so the store can change without them noticing.',
      severity: 'error',
      from: {
        path: '^src/[^/]+/(domain|commands|queries|application|dtos)/',
        // Ledger: these four read ORM repositories directly and still need a
        // port. Three of them reach across into organizations'/roles' tables,
        // which is what makes the port worth defining rather than inlining.
        pathNot: [
          '^src/authz/application/active-organization\\.resolver\\.ts$',
          '^src/authz/application/principal-residency\\.policy\\.ts$',
          '^src/authz/application/scope\\.resolver\\.ts$',
          '^src/profile/application/locale\\.resolver\\.ts$',
        ],
      },
      to: { path: 'node_modules/(typeorm|@nestjs/typeorm)/' },
    },
    {
      name: 'better-auth-stays-behind-an-adapter',
      comment:
        'Better Auth owns the identity tables and is an external system like any other: it is reached through src/auth/infrastructure/ or a module’s own gateway, never imported into a handler or a controller.',
      severity: 'error',
      from: {
        path: '^src/',
        pathNot: [
          '^src/[^/]+/infrastructure/',
          '^src/[^/]+/[^/]+\\.module\\.ts$',
          ...TESTS,
          // Ledger: the last delegating façade that still calls Better Auth
          // from a service instead of a gateway. Cleared when organizations/
          // is cut into use-case slices over an OrganizationGatewayPort.
          '^src/organizations/organizations\\.service\\.ts$',
        ],
      },
      to: { path: 'node_modules/better-auth/' },
    },
    {
      name: 'no-cross-slice-imports',
      comment:
        'Use-case slices are vertical and self-contained. Do not import another slice’s internals (handlers, controllers, request DTOs). Reusing another slice’s bus message (*.command.ts / *.query.ts) to dispatch is allowed.',
      severity: 'error',
      from: { path: '^src/([^/]+)/(commands|queries)/([^/]+)/' },
      to: {
        path: '^src/$1/(commands|queries)/([^/]+)/',
        pathNot: ['^src/$1/(commands|queries)/$3/', '\\.(command|query)\\.ts$'],
      },
    },
    {
      name: 'no-cross-module-internals',
      comment:
        'A module publishes its domain, its DTOs, its ports, its DI tokens, its bus messages and its inbound adapters. Its handlers, controllers, mappers and concrete adapters are its own. Reaching past that surface couples two modules at the seam that is meant to be replaceable.',
      severity: 'error',
      from: { path: '^src/([^/]+)/', pathNot: TESTS },
      to: {
        path: '^src/(?!$1/)[^/]+/',
        pathNot: CROSS_MODULE_PUBLIC_SURFACE,
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'types', 'default'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
