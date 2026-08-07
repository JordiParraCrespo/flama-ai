/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DomainResponseDto = {
    id: string;
    organizationId: string;
    hostname: string;
    protocol: 'https' | 'http';
    status: 'draft' | 'active' | 'paused';
    ownerId: string | null;
    /**
     * Canonical URL
     */
    url: string;
    importSearchConsole: boolean;
    runInitialCrawl: boolean;
    verifiedAt: string | null;
    lastCrawledAt: string | null;
    createdAt: string;
    updatedAt: string;
};

