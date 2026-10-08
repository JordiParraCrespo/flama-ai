import { QueryBase } from '@flama/backend-ddd';

export class FindWorkspaceMemberQuery extends QueryBase {
  readonly workspaceMemberId: string;

  constructor(props: { workspaceMemberId: string }) {
    super();
    this.workspaceMemberId = props.workspaceMemberId;
  }
}
