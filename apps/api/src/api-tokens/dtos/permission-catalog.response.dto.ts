import type { PermissionGroup, Scope } from '@flama/shared';
import { ApiProperty } from '@nestjs/swagger';

/**
 * The permission catalog plus the subset the caller may actually grant. The
 * catalog itself is static and also available from `@flama/shared`; what only
 * the server can answer is `grantable`, which depends on the caller's roles.
 */
export class PermissionCatalogResponseDto {
  @ApiProperty({
    description:
      'Every permission group, each with a Read and an Edit level. Render these as the permission picker.',
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  groups!: readonly PermissionGroup[];

  @ApiProperty({
    description:
      'Scopes the caller may put on a token. Anything outside this list is refused at creation.',
    type: [String],
    example: ['profile:read', 'users:read'],
  })
  grantable!: Scope[];
}
