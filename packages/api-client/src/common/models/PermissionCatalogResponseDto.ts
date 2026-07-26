/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PermissionCatalogResponseDto = {
    /**
     * Every permission group, each with a Read and an Edit level. Render these as the permission picker.
     */
    groups: Array<Record<string, any>>;
    /**
     * Scopes the caller may put on a token. Anything outside this list is refused at creation.
     */
    grantable: Array<string>;
};

