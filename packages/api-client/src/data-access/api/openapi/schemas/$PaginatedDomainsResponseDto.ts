/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $PaginatedDomainsResponseDto = {
    properties: {
        data: {
            type: 'array',
            contains: {
                type: 'DomainResponseDto',
            },
            isRequired: true,
        },
        meta: {
            type: 'PaginationMetaDto',
            isRequired: true,
        },
    },
} as const;
