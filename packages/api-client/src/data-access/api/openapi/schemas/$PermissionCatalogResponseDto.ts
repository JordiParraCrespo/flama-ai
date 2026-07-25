/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $PermissionCatalogResponseDto = {
    properties: {
        groups: {
            type: 'array',
            contains: {
                type: 'dictionary',
                contains: {
                    properties: {
                    },
                },
            },
            isRequired: true,
        },
        grantable: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
    },
} as const;
