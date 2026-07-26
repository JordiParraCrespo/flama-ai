import { QueryBase } from '@flama/backend-ddd';
import type { SubscriptionStatus } from '@flama/shared';

export class FindSubscriptionsQuery extends QueryBase {
  readonly page: number;
  readonly limit: number;
  readonly status?: SubscriptionStatus;

  constructor(props: {
    page: number;
    limit: number;
    status?: SubscriptionStatus;
  }) {
    super();
    this.page = props.page;
    this.limit = props.limit;
    this.status = props.status;
  }
}
