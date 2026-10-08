import type { Invitation } from './invitation.types';
import type { Member } from './membership.types';

/**
 * An organization as the app reads it: Better Auth's `organization` row. A
 * read model — Better Auth writes the row, so there is no aggregate behind it.
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

/** An organization with its roster, its invitations and its teams. */
export interface FullOrganization extends Organization {
  members: Member[];
  invitations: Invitation[];
  teams: Record<string, unknown>[];
}

/** A workspace: a Better Auth team inside an organization. */
export interface Workspace {
  id: string;
  name: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date | null;
}

/** One person's place in a workspace: a Better Auth `teamMember` row. */
export interface WorkspaceMember {
  id: string;
  teamId: string;
  userId: string;
  createdAt: Date;
}
