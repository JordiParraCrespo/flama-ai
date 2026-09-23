/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Scope } from '@flama/shared';
export type CurrentCredentialResponseDto = {
    /**
     * How the caller authenticated.
     */
    kind: 'session' | 'api-token' | 'oauth';
    userId: string;
    email: string;
    /**
     * Scopes the credential carries. Null for a browser session, which is not scope-restricted.
     */
    grantedScopes: Array<Scope> | null;
    /**
     * What the credential can actually do: its scopes intersected with the owner’s current roles.
     */
    effectiveScopes: Array<Scope>;
    /**
     * Organizations the credential is restricted to, or null when unrestricted.
     */
    organizationIds: Array<string> | null;
    expiresAt: string | null;
};

