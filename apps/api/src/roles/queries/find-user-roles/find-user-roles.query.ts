import { QueryBase } from '@flama/backend-ddd';

export class FindUserRolesQuery extends QueryBase {
  readonly userId: string;
  readonly activeOrganizationId?: string | null;

  constructor(userId: string, activeOrganizationId?: string | null) {
    super();
    this.userId = userId;
    this.activeOrganizationId = activeOrganizationId;
  }
}
