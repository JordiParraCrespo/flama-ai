import { CommandBase, type CommandProps } from '@flama/backend-ddd';
import type { FlagCondition } from '@flama/shared';

export class CreateFlagSegmentCommand extends CommandBase {
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  readonly conditions: FlagCondition[];
  readonly actorId: string | null;
  readonly comment?: string;

  constructor(props: CommandProps<CreateFlagSegmentCommand>) {
    super(props);
    this.key = props.key;
    this.name = props.name;
    this.description = props.description;
    this.conditions = props.conditions;
    this.actorId = props.actorId;
    this.comment = props.comment;
  }
}
