/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ApiTokenResponseDto = {
    id: string;
    name: string;
    /**
     * Non-secret display prefix. The secret itself is shown only once, at creation.
     */
    prefix: string;
    /**
     * Granted permissions.
     */
    scopes: Array<string>;
    /**
     * Organizations this token is restricted to. Null means it follows the owner’s memberships.
     */
    organizationIds: Array<string> | null;
    /**
     * Source addresses or CIDR blocks the token may be used from.
     */
    ipAllowlist: Array<string> | null;
    expiresAt: string | null;
    lastUsedAt: string | null;
    revokedAt: string | null;
    createdAt: string;
};

