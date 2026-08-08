/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateLeadRequest } from '../../../../common/models/CreateLeadRequest';
import type { LeadResponseDto } from '../../../../common/models/LeadResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class LeadsApi {
    /**
     * List the leads the caller can reach
     * @returns LeadResponseDto
     * @throws ApiError
     */
    public static list(): CancelablePromise<Array<LeadResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/leads',
        });
    }
    /**
     * Create a lead
     * The lead is filed into the caller’s active organization; the body cannot name a different one.
     * @param requestBody
     * @returns LeadResponseDto
     * @throws ApiError
     */
    public static create(
        requestBody: CreateLeadRequest,
    ): CancelablePromise<LeadResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/leads',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get one lead
     * @param id
     * @returns LeadResponseDto
     * @throws ApiError
     */
    public static get(
        id: string,
    ): CancelablePromise<LeadResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/leads/{id}',
            path: {
                'id': id,
            },
            errors: {
                404: `LEAD_001 — Lead not found`,
            },
        });
    }
}
