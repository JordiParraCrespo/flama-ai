import { QueryBase } from '@flama/backend-ddd';
import type { FlagEvaluationContext } from '@flama/shared';

/** The caller's client-visible flags, evaluated for them. */
export class GetClientFeatureFlagsQuery extends QueryBase {
  readonly context: FlagEvaluationContext;

  constructor(context: FlagEvaluationContext) {
    super();
    this.context = context;
  }
}
