/* Hand-kept in the shape of the legacy client — see this package's AGENTS.md */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type {
  ClientFlagContextInput,
  CreateFlagSegmentInput,
  EvaluateFeatureFlagInput,
  FindFlagChangesInput,
  ToggleFeatureFlagInput,
  UpdateFeatureFlagInput,
  UpdateFlagSegmentInput,
} from '@flama/shared';
import type { ClientFeatureFlagsResponseDto } from '../../../../common/models/ClientFeatureFlagsResponseDto';
import type { FeatureFlagResponseDto } from '../../../../common/models/FeatureFlagResponseDto';
import type { FlagEvaluationResponseDto } from '../../../../common/models/FlagEvaluationResponseDto';
import type { FlagSegmentResponseDto } from '../../../../common/models/FlagSegmentResponseDto';
import type { PaginatedFlagChangesResponseDto } from '../../../../common/models/PaginatedFlagChangesResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

const AUTH_ERRORS = {
  401: `AUTH_001 / TOKEN_003 — No credential was presented, or it is invalid or expired`,
  403: `AUTH_002 / TOKEN_004 / TOKEN_005 / TOKEN_006 / TOKEN_007 — The caller's roles, or their credential's scopes, do not permit this`,
};

export class FeatureFlagsApi {
  /**
   * The caller’s feature flags — every client-visible flag, evaluated for them.
   * Works signed out.
   * @returns ClientFeatureFlagsResponseDto
   * @throws ApiError
   */
  public static getClientFeatureFlags(
    context: ClientFlagContextInput = {},
  ): CancelablePromise<ClientFeatureFlagsResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/v1/feature-flags',
      query: {
        platform: context.platform,
        appVersion: context.appVersion,
      },
    });
  }

  /**
   * List feature flags with their targeting
   * @returns FeatureFlagResponseDto
   * @throws ApiError
   */
  public static findFeatureFlags(): CancelablePromise<Array<FeatureFlagResponseDto>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/v1/feature-flags/admin',
      errors: AUTH_ERRORS,
    });
  }

  /**
   * Get a feature flag with its targeting
   * @returns FeatureFlagResponseDto
   * @throws ApiError
   */
  public static findFeatureFlag(key: string): CancelablePromise<FeatureFlagResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/v1/feature-flags/admin/{key}',
      path: { key },
      errors: { ...AUTH_ERRORS, 404: `FLAG_001 — No such flag in the catalog` },
    });
  }

  /**
   * Replace a feature flag’s targeting
   * @returns FeatureFlagResponseDto
   * @throws ApiError
   */
  public static updateFeatureFlag(
    key: string,
    requestBody: UpdateFeatureFlagInput,
  ): CancelablePromise<FeatureFlagResponseDto> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/v1/feature-flags/admin/{key}',
      path: { key },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        ...AUTH_ERRORS,
        404: `FLAG_001 — No such flag in the catalog`,
        422: `FLAG_002 — Targeting serves a value the flag does not take, or targets a missing segment`,
      },
    });
  }

  /**
   * Switch a feature flag on or off
   * @returns FeatureFlagResponseDto
   * @throws ApiError
   */
  public static toggleFeatureFlag(
    key: string,
    requestBody: ToggleFeatureFlagInput,
  ): CancelablePromise<FeatureFlagResponseDto> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/v1/feature-flags/admin/{key}',
      path: { key },
      body: requestBody,
      mediaType: 'application/json',
      errors: { ...AUTH_ERRORS, 404: `FLAG_001 — No such flag in the catalog` },
    });
  }

  /**
   * Explain a flag for a given context
   * @returns FlagEvaluationResponseDto
   * @throws ApiError
   */
  public static evaluateFeatureFlag(
    key: string,
    context: EvaluateFeatureFlagInput = {},
  ): CancelablePromise<FlagEvaluationResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/v1/feature-flags/admin/{key}/evaluate',
      path: { key },
      query: { ...context },
      errors: { ...AUTH_ERRORS, 404: `FLAG_001 — No such flag in the catalog` },
    });
  }

  /**
   * Feature flag audit trail
   * @returns PaginatedFlagChangesResponseDto
   * @throws ApiError
   */
  public static findFlagChanges(
    params: Partial<FindFlagChangesInput> = {},
  ): CancelablePromise<PaginatedFlagChangesResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/v1/feature-flags/changes',
      query: {
        subjectType: params.subjectType,
        subjectKey: params.subjectKey,
        page: params.page,
        limit: params.limit,
      },
      errors: AUTH_ERRORS,
    });
  }

  /**
   * List flag segments and the flags that target them
   * @returns FlagSegmentResponseDto
   * @throws ApiError
   */
  public static findFlagSegments(): CancelablePromise<Array<FlagSegmentResponseDto>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/v1/feature-flags/segments',
      errors: AUTH_ERRORS,
    });
  }

  /**
   * Create a flag segment
   * @returns FlagSegmentResponseDto
   * @throws ApiError
   */
  public static createFlagSegment(
    requestBody: CreateFlagSegmentInput,
  ): CancelablePromise<FlagSegmentResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/v1/feature-flags/segments',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        ...AUTH_ERRORS,
        409: `FLAG_005 — Segment key taken`,
        422: `FLAG_007 — Invalid segment conditions`,
      },
    });
  }

  /**
   * Update a flag segment
   * @returns FlagSegmentResponseDto
   * @throws ApiError
   */
  public static updateFlagSegment(
    key: string,
    requestBody: UpdateFlagSegmentInput,
  ): CancelablePromise<FlagSegmentResponseDto> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/v1/feature-flags/segments/{key}',
      path: { key },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        ...AUTH_ERRORS,
        404: `FLAG_004 — Segment not found`,
        422: `FLAG_007 — Invalid segment conditions`,
      },
    });
  }

  /**
   * Delete a flag segment no flag targets
   * @returns void
   * @throws ApiError
   */
  public static deleteFlagSegment(key: string): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/v1/feature-flags/segments/{key}',
      path: { key },
      errors: {
        ...AUTH_ERRORS,
        404: `FLAG_004 — Segment not found`,
        409: `FLAG_006 — Still targeted by a flag`,
      },
    });
  }
}
