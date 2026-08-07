import { ApiProperty } from '@nestjs/swagger';

/**
 * A user's per-domain restriction. `unrestricted` is the meaningful state the
 * design's member table shows as "All domains": no rows recorded, so the
 * user's role applies across every domain in the workspace.
 */
export class UserDomainAccessResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({
    type: [String],
    description: 'Domain ids the user is restricted to. Empty when unrestricted.',
  })
  domainIds!: string[];

  @ApiProperty({
    description: 'True when no per-domain restriction is recorded.',
  })
  unrestricted!: boolean;
}
