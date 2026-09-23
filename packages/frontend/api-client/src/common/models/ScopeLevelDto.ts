/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Scope } from '@flama/shared';
import type { ScopePolicyDto } from './ScopePolicyDto';
export type ScopeLevelDto = {
    scope: Scope;
    label: string;
    description: string;
    /**
     * Empty when the level governs the caller’s own account only.
     */
    policies: Array<ScopePolicyDto>;
};

