/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserDomainAccessResponseDto = {
    userId: string;
    /**
     * Domain ids the user is restricted to. Empty when unrestricted.
     */
    domainIds: Array<string>;
    /**
     * True when no per-domain restriction is recorded.
     */
    unrestricted: boolean;
};

