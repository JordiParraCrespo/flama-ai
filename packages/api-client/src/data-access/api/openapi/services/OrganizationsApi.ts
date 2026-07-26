/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckSlugRequest } from '../../../../common/models/CheckSlugRequest';
import type { CreateOrganizationRequest } from '../../../../common/models/CreateOrganizationRequest';
import type { FullOrganizationResponseDto } from '../../../../common/models/FullOrganizationResponseDto';
import type { OrganizationResponseDto } from '../../../../common/models/OrganizationResponseDto';
import type { SlugAvailabilityResponseDto } from '../../../../common/models/SlugAvailabilityResponseDto';
import type { UpdateOrganizationRequest } from '../../../../common/models/UpdateOrganizationRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OrganizationsApi {
    /**
     * Create an organization
     * @param requestBody
     * @returns OrganizationResponseDto
     * @throws ApiError
     */
    public static create(
        requestBody: CreateOrganizationRequest,
    ): CancelablePromise<OrganizationResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/organizations',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List the caller's organizations
     * @returns OrganizationResponseDto
     * @throws ApiError
     */
    public static list(): CancelablePromise<Array<OrganizationResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/organizations',
        });
    }
    /**
     * Check whether an organization slug is available
     * @param requestBody
     * @returns SlugAvailabilityResponseDto
     * @throws ApiError
     */
    public static checkSlug(
        requestBody: CheckSlugRequest,
    ): CancelablePromise<SlugAvailabilityResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/organizations/check-slug',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get an organization with its members, invitations and workspaces
     * @param id
     * @returns FullOrganizationResponseDto
     * @throws ApiError
     */
    public static getFull(
        id: string,
    ): CancelablePromise<FullOrganizationResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/organizations/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Update an organization
     * @param id
     * @param requestBody
     * @returns OrganizationResponseDto
     * @throws ApiError
     */
    public static update(
        id: string,
        requestBody: UpdateOrganizationRequest,
    ): CancelablePromise<OrganizationResponseDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/organizations/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Delete an organization
     * @param id
     * @returns OrganizationResponseDto
     * @throws ApiError
     */
    public static remove(
        id: string,
    ): CancelablePromise<OrganizationResponseDto> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/organizations/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Set the active organization for the current session
     * @param id
     * @returns OrganizationResponseDto
     * @throws ApiError
     */
    public static setActive(
        id: string,
    ): CancelablePromise<OrganizationResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/organizations/{id}/set-active',
            path: {
                'id': id,
            },
        });
    }
}
