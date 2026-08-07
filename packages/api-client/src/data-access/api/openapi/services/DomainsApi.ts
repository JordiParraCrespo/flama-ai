/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConnectDomainRequest } from '../../../../common/models/ConnectDomainRequest';
import type { DomainResponseDto } from '../../../../common/models/DomainResponseDto';
import type { PaginatedDomainsResponseDto } from '../../../../common/models/PaginatedDomainsResponseDto';
import type { SetUserDomainAccessRequest } from '../../../../common/models/SetUserDomainAccessRequest';
import type { UpdateDomainRequest } from '../../../../common/models/UpdateDomainRequest';
import type { UserDomainAccessResponseDto } from '../../../../common/models/UserDomainAccessResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DomainsApi {
    /**
     * List domains
     * Lists domains in the caller’s active organization, narrowed to the domains the caller has access to.
     * @param search Search by hostname
     * @param ownerId Filter by owner
     * @param status
     * @param limit Items per page (default: 20, max: 100)
     * @param page Page number (default: 1)
     * @returns PaginatedDomainsResponseDto
     * @throws ApiError
     */
    public static findAll(
        search?: string,
        ownerId?: string,
        status?: 'draft' | 'active' | 'paused',
        limit?: number,
        page?: number,
    ): CancelablePromise<PaginatedDomainsResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/domains',
            query: {
                'search': search,
                'ownerId': ownerId,
                'status': status,
                'limit': limit,
                'page': page,
            },
            errors: {
                400: `DOMAIN_005 — No active organization on the session`,
            },
        });
    }
    /**
     * Connect a domain
     * Starts tracking a domain in the caller’s active organization. The domain is created in `draft` and becomes activatable once verified.
     * @param requestBody
     * @returns DomainResponseDto
     * @throws ApiError
     */
    public static connect(
        requestBody: ConnectDomainRequest,
    ): CancelablePromise<DomainResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/domains',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `DOMAIN_005 — No active organization on the session`,
                409: `DOMAIN_002 — Domain is already tracked in this organization`,
            },
        });
    }
    /**
     * Get a domain
     * @param id
     * @returns DomainResponseDto
     * @throws ApiError
     */
    public static findById(
        id: string,
    ): CancelablePromise<DomainResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/domains/{id}',
            path: {
                'id': id,
            },
            errors: {
                403: `DOMAIN_006 — Caller has no access to this domain`,
                404: `DOMAIN_001 — Domain not found`,
            },
        });
    }
    /**
     * Update a domain
     * Changes the protocol, owner or lifecycle status. Activating a domain requires it to be verified first.
     * @param id
     * @param requestBody
     * @returns DomainResponseDto
     * @throws ApiError
     */
    public static update(
        id: string,
        requestBody: UpdateDomainRequest,
    ): CancelablePromise<DomainResponseDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/domains/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                403: `DOMAIN_006 — Caller has no access to this domain`,
                404: `DOMAIN_001 — Domain not found`,
                409: `DOMAIN_004 — Domain must be verified before it can be activated`,
            },
        });
    }
    /**
     * Remove a domain
     * Stops tracking the domain. Leads captured from it are kept and detached rather than deleted.
     * @param id
     * @returns void
     * @throws ApiError
     */
    public static remove(
        id: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/domains/{id}',
            path: {
                'id': id,
            },
            errors: {
                403: `DOMAIN_006 — Caller has no access to this domain`,
                404: `DOMAIN_001 — Domain not found`,
            },
        });
    }
    /**
     * Get a user’s domain access
     * Returns the domains the user is restricted to. `unrestricted` is true when no restriction is recorded and their role applies workspace-wide.
     * @param userId
     * @returns UserDomainAccessResponseDto
     * @throws ApiError
     */
    public static findOne(
        userId: string,
    ): CancelablePromise<UserDomainAccessResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/users/{userId}/domains',
            path: {
                'userId': userId,
            },
        });
    }
    /**
     * Replace a user’s domain access
     * Restricts the user to the given domains. An empty list clears the restriction, returning them to workspace-wide access under their role.
     * @param userId
     * @param requestBody
     * @returns UserDomainAccessResponseDto
     * @throws ApiError
     */
    public static set(
        userId: string,
        requestBody: SetUserDomainAccessRequest,
    ): CancelablePromise<UserDomainAccessResponseDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/users/{userId}/domains',
            path: {
                'userId': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `DOMAIN_001 — One or more domain ids are unknown in this organization`,
            },
        });
    }
}
