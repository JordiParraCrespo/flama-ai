/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiTokenResponseDto } from '../../../../common/models/ApiTokenResponseDto';
import type { CreateApiTokenRequest } from '../../../../common/models/CreateApiTokenRequest';
import type { CreatedApiTokenResponseDto } from '../../../../common/models/CreatedApiTokenResponseDto';
import type { PermissionCatalogResponseDto } from '../../../../common/models/PermissionCatalogResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ApiTokensApi {
    /**
     * List the caller’s API tokens
     * Secrets are never returned — only the display prefix and metadata.
     * @returns ApiTokenResponseDto
     * @throws ApiError
     */
    public static findAll(): CancelablePromise<Array<ApiTokenResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tokens',
        });
    }
    /**
     * Mint an API token
     * Creates a scoped API token for the caller. The secret is returned once and cannot be retrieved again. Scopes may not exceed what the caller is themselves permitted to do.
     * @param requestBody
     * @returns CreatedApiTokenResponseDto
     * @throws ApiError
     */
    public static create(
        requestBody: CreateApiTokenRequest,
    ): CancelablePromise<CreatedApiTokenResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/tokens',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                403: `TOKEN_002: requested scopes exceed the caller’s own permissions; TOKEN_008: not a member of a requested organization`,
                409: `TOKEN_009: active token limit reached`,
            },
        });
    }
    /**
     * List the permission catalog and what the caller may grant
     * Drives the permission picker on the token-creation screen and the CLI’s --permissions validation.
     * @returns PermissionCatalogResponseDto
     * @throws ApiError
     */
    public static permissions(): CancelablePromise<PermissionCatalogResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tokens/permissions',
        });
    }
    /**
     * Revoke an API token
     * Takes effect immediately. The record is kept so the audit trail survives; the secret stops working.
     * @param id
     * @returns void
     * @throws ApiError
     */
    public static revoke(
        id: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/tokens/{id}',
            path: {
                'id': id,
            },
            errors: {
                404: `TOKEN_001: token not found`,
            },
        });
    }
}
