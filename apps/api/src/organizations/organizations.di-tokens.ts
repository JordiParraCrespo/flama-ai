/** Reads of Better Auth's `member` table, joined to the accounts behind it. */
export const MEMBER_REPOSITORY = Symbol('MEMBER_REPOSITORY');
/** Reads of Better Auth's `invitation` table. */
export const INVITATION_REPOSITORY = Symbol('INVITATION_REPOSITORY');
/** Better Auth's organization and team rows, read to answer with what was just written. */
export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY');
/** Access grants and session selection that outlive a membership. */
export const ORGANIZATION_ACCESS = Symbol('ORGANIZATION_ACCESS');

/** Better Auth's organization plugin: organizations and their members. */
export const ORGANIZATION_AUTH = Symbol('ORGANIZATION_AUTH');
/** Better Auth's organization plugin: invitations. */
export const INVITATION_AUTH = Symbol('INVITATION_AUTH');
/** Better Auth's organization plugin: teams, which the app calls workspaces. */
export const WORKSPACE_AUTH = Symbol('WORKSPACE_AUTH');
