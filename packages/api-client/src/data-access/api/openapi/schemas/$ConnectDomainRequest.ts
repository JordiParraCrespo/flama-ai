/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ConnectDomainRequest = {
    properties: {
        hostname: {
            type: 'string',
            isRequired: true,
            maxLength: 253,
            minLength: 4,
            pattern: '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$',
        },
        protocol: {
            type: 'Enum',
        },
        ownerId: {
            type: 'string',
            format: 'uuid',
        },
        importSearchConsole: {
            type: 'boolean',
        },
        runInitialCrawl: {
            type: 'boolean',
        },
    },
} as const;
