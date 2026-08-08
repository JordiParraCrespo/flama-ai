/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AuthzCatalogResponseDto } from '../../../../common/models/AuthzCatalogResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthorizationApi {
    /**
     * List every declared resource and what the caller may grant
     * Drives the role builder. Resources are contributed by the modules that own them, so a new module appears here without editing a central catalog.
     * @returns AuthzCatalogResponseDto
     * @throws ApiError
     */
    public static catalog(): CancelablePromise<AuthzCatalogResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/authz/catalog',
        });
    }
}
