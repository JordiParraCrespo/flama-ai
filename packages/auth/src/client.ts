import { adminClient, inferAdditionalFields } from 'better-auth/client/plugins';
// flama:begin organizations
import { organizationClientPlugin } from './organization-client';
// flama:end organizations
// flama:plugins client-plugin-imports
import { userAdditionalFields } from './user-fields';

/**
 * The client plugins every Flama Better Auth client shares, mirroring the
 * server's plugin set in `apps/api/src/auth/infrastructure/better-auth.config.ts`. Platform-specific
 * plugins (the Expo client on mobile) are prepended by each app.
 *
 * A factory rather than a shared array so each platform gets fresh plugin
 * instances. The return type is deliberately inferred — and this entry ships
 * as TypeScript source (see the package README) — so Better Auth's type
 * inference flows through to each app's `createAuthClient` call.
 */
export function sharedClientPlugins() {
  return [
    // Mirror the server's `user.additionalFields` so session/user types match.
    inferAdditionalFields({ user: userAdditionalFields }),
    // Super-admin operations (list/ban/impersonate/set-role) under
    // `authClient.admin.*`.
    adminClient(),
    // flama:begin organizations
    // Organizations, members, invitations and workspaces (teams) under
    // `authClient.organization.*`.
    organizationClientPlugin(),
    // flama:end organizations
    // flama:plugins client-plugins
  ] as const;
}

// flama:begin organizations
export { organizationSharedOptions } from './organization-options';
// flama:end organizations
// flama:plugins tenancy-exports
export type {
  AuthSession,
  AuthSessionUser,
} from './session';
export { toAuthSession } from './session';
export { consumeSessionPreload } from './session-preload';
export { type AuthErrorResult, AuthRequestError, unwrap } from './unwrap';
export { userAdditionalFields } from './user-fields';
