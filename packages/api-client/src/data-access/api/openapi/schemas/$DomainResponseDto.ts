/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DomainResponseDto = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
        },
        organizationId: {
            type: 'string',
            isRequired: true,
        },
        hostname: {
            type: 'string',
            isRequired: true,
        },
        protocol: {
            type: 'Enum',
            isRequired: true,
        },
        status: {
            type: 'Enum',
            isRequired: true,
        },
        ownerId: {
            type: 'string',
            isRequired: true,
            isNullable: true,
        },
        url: {
            type: 'string',
            description: `Canonical URL`,
            isRequired: true,
        },
        importSearchConsole: {
            type: 'boolean',
            isRequired: true,
        },
        runInitialCrawl: {
            type: 'boolean',
            isRequired: true,
        },
        verifiedAt: {
            type: 'string',
            isRequired: true,
            isNullable: true,
            format: 'date-time',
        },
        lastCrawledAt: {
            type: 'string',
            isRequired: true,
            isNullable: true,
            format: 'date-time',
        },
        createdAt: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        updatedAt: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
    },
} as const;
