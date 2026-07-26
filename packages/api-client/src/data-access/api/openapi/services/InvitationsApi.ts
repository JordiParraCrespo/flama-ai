/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InvitationResponseDto } from '../../../../common/models/InvitationResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class InvitationsApi {
    /**
     * List the caller's pending invitations
     * @returns InvitationResponseDto
     * @throws ApiError
     */
    public static listMine(): CancelablePromise<Array<InvitationResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/invitations',
        });
    }
    /**
     * Get an invitation by id
     * @param id
     * @returns InvitationResponseDto
     * @throws ApiError
     */
    public static get(
        id: string,
    ): CancelablePromise<InvitationResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/invitations/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Accept an invitation
     * @param id
     * @returns InvitationResponseDto
     * @throws ApiError
     */
    public static accept(
        id: string,
    ): CancelablePromise<InvitationResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/invitations/{id}/accept',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Reject an invitation
     * @param id
     * @returns InvitationResponseDto
     * @throws ApiError
     */
    public static reject(
        id: string,
    ): CancelablePromise<InvitationResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/invitations/{id}/reject',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Cancel an invitation (organization manager)
     * @param id
     * @returns InvitationResponseDto
     * @throws ApiError
     */
    public static cancel(
        id: string,
    ): CancelablePromise<InvitationResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/invitations/{id}/cancel',
            path: {
                'id': id,
            },
        });
    }
}
