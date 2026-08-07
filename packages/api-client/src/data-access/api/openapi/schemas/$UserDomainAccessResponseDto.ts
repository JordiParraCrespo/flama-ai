/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $UserDomainAccessResponseDto = {
    properties: {
        userId: {
            type: 'string',
            isRequired: true,
        },
        domainIds: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
        unrestricted: {
            type: 'boolean',
            description: `True when no per-domain restriction is recorded.`,
            isRequired: true,
        },
    },
} as const;
