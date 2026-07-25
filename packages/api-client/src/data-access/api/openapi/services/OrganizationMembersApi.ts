/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddMemberRequest } from '../../../../common/models/AddMemberRequest';
import type { MemberResponseDto } from '../../../../common/models/MemberResponseDto';
import type { UpdateMemberRoleRequest } from '../../../../common/models/UpdateMemberRoleRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OrganizationMembersApi {
    /**
     * Get the caller's membership in the active organization
     * @returns MemberResponseDto
     * @throws ApiError
     */
    public static active(): CancelablePromise<MemberResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/organizations/{orgId}/members/me',
        });
    }
    /**
     * List members of an organization
     * @param orgId
     * @returns MemberResponseDto
     * @throws ApiError
     */
    public static list(
        orgId: string,
    ): CancelablePromise<Array<MemberResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/organizations/{orgId}/members',
            path: {
                'orgId': orgId,
            },
        });
    }
    /**
     * Add an existing user as a member
     * @param orgId
     * @param requestBody
     * @returns MemberResponseDto
     * @throws ApiError
     */
    public static add(
        orgId: string,
        requestBody: AddMemberRequest,
    ): CancelablePromise<MemberResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/organizations/{orgId}/members',
            path: {
                'orgId': orgId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Change a member's organization role
     * @param orgId
     * @param memberId
     * @param requestBody
     * @returns MemberResponseDto
     * @throws ApiError
     */
    public static updateRole(
        orgId: string,
        memberId: string,
        requestBody: UpdateMemberRoleRequest,
    ): CancelablePromise<MemberResponseDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/organizations/{orgId}/members/{memberId}',
            path: {
                'orgId': orgId,
                'memberId': memberId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Remove a member from an organization
     * @param orgId
     * @param memberIdOrEmail
     * @returns MemberResponseDto
     * @throws ApiError
     */
    public static remove(
        orgId: string,
        memberIdOrEmail: string,
    ): CancelablePromise<MemberResponseDto> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/organizations/{orgId}/members/{memberIdOrEmail}',
            path: {
                'orgId': orgId,
                'memberIdOrEmail': memberIdOrEmail,
            },
        });
    }
    /**
     * Leave an organization
     * @param orgId
     * @returns MemberResponseDto
     * @throws ApiError
     */
    public static leave(
        orgId: string,
    ): CancelablePromise<MemberResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/organizations/{orgId}/leave',
            path: {
                'orgId': orgId,
            },
        });
    }
}
