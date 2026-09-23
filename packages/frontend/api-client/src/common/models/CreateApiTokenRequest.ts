/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Scope } from '@flama/shared';
export type CreateApiTokenRequest = {
    name: string;
    scopes: Array<Scope>;
    organizationIds?: Array<string>;
    expiresInDays?: number | null;
    ipAllowlist?: Array<string>;
};

