import { QueryBase } from '@flama/backend-ddd';
import type { DomainStatus } from '@flama/shared';

export class FindDomainsQuery extends QueryBase {
  readonly organizationId: string;
  /** Caller, so the handler can apply their per-domain restriction. */
  readonly requesterId: string;
  readonly page: number;
  readonly limit: number;
  readonly status?: DomainStatus;
  readonly ownerId?: string;
  readonly search?: string;

  constructor(props: {
    organizationId: string;
    requesterId: string;
    page: number;
    limit: number;
    status?: DomainStatus;
    ownerId?: string;
    search?: string;
  }) {
    super();
    this.organizationId = props.organizationId;
    this.requesterId = props.requesterId;
    this.page = props.page;
    this.limit = props.limit;
    this.status = props.status;
    this.ownerId = props.ownerId;
    this.search = props.search;
  }
}
