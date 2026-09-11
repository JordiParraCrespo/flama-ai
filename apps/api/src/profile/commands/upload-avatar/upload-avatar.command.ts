import { CommandBase, type CommandProps } from '@flama/backend-ddd';

export class UploadAvatarCommand extends CommandBase {
  readonly userId: string;
  readonly buffer: Buffer;
  readonly mimeType: string;
  readonly size: number;

  constructor(props: CommandProps<UploadAvatarCommand>) {
    super(props);
    this.userId = props.userId;
    this.buffer = props.buffer;
    this.mimeType = props.mimeType;
    this.size = props.size;
  }
}
