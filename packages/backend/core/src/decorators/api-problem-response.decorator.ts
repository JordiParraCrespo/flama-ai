import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ProblemDetailsDto } from '../dtos/problem-details.dto';
import { PROBLEM_JSON_CONTENT_TYPE } from '../errors/problem-details';

export interface ApiProblemResponseOptions {
  status: number;
  /** What went wrong, e.g. `'Token not found'`. */
  description: string;
  /** Catalog code(s) this status can carry, e.g. `'TOKEN_001'`. */
  code?: string | string[];
}

/**
 * Documents an error response as an RFC 7807 problem document.
 *
 * Use it instead of a bare `@ApiResponse` for failures so the OpenAPI document
 * — and therefore the generated client — knows the body is
 * `application/problem+json` shaped like `ProblemDetailsDto`.
 *
 * ```ts
 * @ApiProblemResponse({ status: 404, description: 'Token not found', code: 'TOKEN_001' })
 * ```
 */
export function ApiProblemResponse({ status, description, code }: ApiProblemResponseOptions) {
  const codes = code ? [code].flat() : [];
  return applyDecorators(
    ApiExtraModels(ProblemDetailsDto),
    ApiResponse({
      status,
      description: codes.length ? `${codes.join(' / ')} — ${description}` : description,
      content: {
        [PROBLEM_JSON_CONTENT_TYPE]: {
          schema: { $ref: getSchemaPath(ProblemDetailsDto) },
        },
      },
    }),
  );
}
