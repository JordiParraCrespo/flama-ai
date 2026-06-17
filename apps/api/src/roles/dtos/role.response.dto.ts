import type { PermissionDefinition } from '@flama/shared';
import { ApiProperty } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ description: 'System roles cannot be deleted or renamed.' })
  isSystem!: boolean;

  @ApiProperty({
    description: 'CASL permission rules granted by this role.',
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  permissions!: PermissionDefinition[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
