/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddWorkspaceMemberRequest } from '../../../../common/models/AddWorkspaceMemberRequest';
import type { CreateWorkspaceRequest } from '../../../../common/models/CreateWorkspaceRequest';
import type { UpdateWorkspaceRequest } from '../../../../common/models/UpdateWorkspaceRequest';
import type { WorkspaceMemberResponseDto } from '../../../../common/models/WorkspaceMemberResponseDto';
import type { WorkspaceResponseDto } from '../../../../common/models/WorkspaceResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class WorkspacesApi {
    /**
     * List the caller's workspaces
     * @returns WorkspaceResponseDto
     * @throws ApiError
     */
    public static listMine(): CancelablePromise<Array<WorkspaceResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/workspaces/mine',
        });
    }
    /**
     * List an organization's workspaces (defaults to the active org)
     * @param organizationId
     * @returns WorkspaceResponseDto
     * @throws ApiError
     */
    public static list(
        organizationId?: string,
    ): CancelablePromise<Array<WorkspaceResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/workspaces',
            query: {
                'organizationId': organizationId,
            },
        });
    }
    /**
     * Create a workspace
     * @param requestBody
     * @returns WorkspaceResponseDto
     * @throws ApiError
     */
    public static create(
        requestBody: CreateWorkspaceRequest,
    ): CancelablePromise<WorkspaceResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/workspaces',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Rename a workspace
     * @param id
     * @param requestBody
     * @returns WorkspaceResponseDto
     * @throws ApiError
     */
    public static update(
        id: string,
        requestBody: UpdateWorkspaceRequest,
    ): CancelablePromise<WorkspaceResponseDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/workspaces/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Delete a workspace
     * @param id
     * @returns void
     * @throws ApiError
     */
    public static remove(
        id: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/workspaces/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Set the active workspace for the current session
     * @param id
     * @returns WorkspaceResponseDto
     * @throws ApiError
     */
    public static setActive(
        id: string,
    ): CancelablePromise<WorkspaceResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/workspaces/{id}/set-active',
            path: {
                'id': id,
            },
        });
    }
    /**
     * List members of a workspace
     * @param id
     * @returns WorkspaceMemberResponseDto
     * @throws ApiError
     */
    public static listMembers(
        id: string,
    ): CancelablePromise<Array<WorkspaceMemberResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/workspaces/{id}/members',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Add a user to a workspace
     * @param id
     * @param requestBody
     * @returns WorkspaceMemberResponseDto
     * @throws ApiError
     */
    public static addMember(
        id: string,
        requestBody: AddWorkspaceMemberRequest,
    ): CancelablePromise<WorkspaceMemberResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/workspaces/{id}/members',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Remove a user from a workspace
     * @param id
     * @param userId
     * @returns void
     * @throws ApiError
     */
    public static removeMember(
        id: string,
        userId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/workspaces/{id}/members/{userId}',
            path: {
                'id': id,
                'userId': userId,
            },
        });
    }
}
