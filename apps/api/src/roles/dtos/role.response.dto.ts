import type { PermissionDefinition } from '@flama/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ description: 'System roles cannot be deleted or renamed.' })
  isSystem!: boolean;

  @ApiPropertyOptional({
    description: 'Owning organization, or null for a global role template shared by every tenant.',
    nullable: true,
    type: String,
  })
  organizationId!: string | null;

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
