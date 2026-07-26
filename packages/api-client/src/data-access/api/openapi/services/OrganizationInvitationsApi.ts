/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InvitationResponseDto } from '../../../../common/models/InvitationResponseDto';
import type { InviteMemberRequest } from '../../../../common/models/InviteMemberRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OrganizationInvitationsApi {
    /**
     * Invite a member to an organization
     * @param orgId
     * @param requestBody
     * @returns InvitationResponseDto
     * @throws ApiError
     */
    public static invite(
        orgId: string,
        requestBody: InviteMemberRequest,
    ): CancelablePromise<InvitationResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/organizations/{orgId}/invitations',
            path: {
                'orgId': orgId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List pending invitations for an organization
     * @param orgId
     * @returns InvitationResponseDto
     * @throws ApiError
     */
    public static list(
        orgId: string,
    ): CancelablePromise<Array<InvitationResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/organizations/{orgId}/invitations',
            path: {
                'orgId': orgId,
            },
        });
    }
}
