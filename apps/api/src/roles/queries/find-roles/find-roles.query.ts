import { QueryBase } from '@flama/backend-ddd';

export class FindRolesQuery extends QueryBase {
  readonly page: number;
  readonly limit: number;
  readonly search?: string;

  constructor(props: { page: number; limit: number; search?: string }) {
    super();
    this.page = props.page;
    this.limit = props.limit;
    this.search = props.search;
  }
}
