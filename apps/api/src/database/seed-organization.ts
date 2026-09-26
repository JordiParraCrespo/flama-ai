import { randomUUID } from 'node:crypto';
import type { Role } from '@flama/shared';
import type { DataSource, Repository } from 'typeorm';
import { MemberOrmEntity } from '../organizations/database/member.orm-entity';
import { OrganizationOrmEntity } from '../organizations/database/organization.orm-entity';
import { TeamOrmEntity } from '../organizations/database/team.orm-entity';
import { TeamMemberOrmEntity } from '../organizations/database/team-member.orm-entity';
import type { RoleOrmEntity } from '../roles/database/role.orm-entity';
import type { UserRoleOrmEntity } from '../roles/database/user-role.orm-entity';
import type { UserOrmEntity } from '../users/database/user.orm-entity';

/** The one organization the development database is built around. */
const SEED_ORGANIZATION = {
  name: 'Flama',
  slug: 'flama',
  workspace: 'General',
} as const;

/**
 * Who is in {@link SEED_ORGANIZATION}, and as what. `organizationRole` is
 * Better Auth's roster role; `applicationRole` is the CASL role scoped to the
 * organization, mapped the same way `applicationRoleFor` maps it everywhere
 * else (`owner`/`admin` → the tenant `owner` role, anything else → `user`).
 */
const SEED_MEMBERSHIPS: Record<string, { organizationRole: string; applicationRole: Role }> = {
  'superadmin@flama.dev': { organizationRole: 'owner', applicationRole: 'owner' },
  'admin@flama.dev': { organizationRole: 'owner', applicationRole: 'owner' },
  'user@flama.dev': { organizationRole: 'member', applicationRole: 'user' },
};

/**
 * The workspace the seeded accounts share, and the memberships that open it.
 *
 * Sign-up used to provision a personal organization for every account, so the
 * seed got its tenant as a side effect of creating users. It no longer does —
 * an account holds nothing until it creates a workspace or an invitation puts
 * it in one — so the seed says out loud what it wants: one organization, with
 * the three accounts in the roles that make the development database
 * interesting.
 *
 * - `admin` and `superadmin` join as `owner`, and hold the org-scoped `owner`
 *   application role — the same one `OrganizationsService.create` writes for
 *   whoever creates an organization, and the invitation path writes for an
 *   invited owner.
 * - `user` joins as a plain `member`, which keeps a *restricted but signed-in*
 *   account in the seed.
 */
export async function seedOrganization(
  dataSource: DataSource,
  userRepo: Repository<UserOrmEntity>,
  roleRepo: Repository<RoleOrmEntity>,
  userRoleRepo: Repository<UserRoleOrmEntity>,
): Promise<void> {
  const organizationRepo = dataSource.getRepository(OrganizationOrmEntity);
  const memberRepo = dataSource.getRepository(MemberOrmEntity);
  const teamRepo = dataSource.getRepository(TeamOrmEntity);
  const teamMemberRepo = dataSource.getRepository(TeamMemberOrmEntity);

  let organization = await organizationRepo.findOneBy({ slug: SEED_ORGANIZATION.slug });
  if (!organization) {
    organization = await organizationRepo.save(
      organizationRepo.create({
        id: randomUUID(),
        name: SEED_ORGANIZATION.name,
        slug: SEED_ORGANIZATION.slug,
        createdAt: new Date(),
      }),
    );
    console.log(`Created organization: ${SEED_ORGANIZATION.name}`);
  }

  let team = await teamRepo.findOneBy({
    organizationId: organization.id,
    name: SEED_ORGANIZATION.workspace,
  });
  if (!team) {
    team = await teamRepo.save(
      teamRepo.create({
        id: randomUUID(),
        name: SEED_ORGANIZATION.workspace,
        organizationId: organization.id,
        createdAt: new Date(),
      }),
    );
  }

  for (const [email, membership] of Object.entries(SEED_MEMBERSHIPS)) {
    const user = await userRepo.findOneBy({ email });
    if (!user) continue;

    const existing = await memberRepo.findOneBy({
      organizationId: organization.id,
      userId: user.id,
    });
    if (!existing) {
      await memberRepo.insert({
        id: randomUUID(),
        organizationId: organization.id,
        userId: user.id,
        role: membership.organizationRole,
        createdAt: new Date(),
      });
    }

    const inTeam = await teamMemberRepo.findOneBy({ teamId: team.id, userId: user.id });
    if (!inTeam) {
      await teamMemberRepo.insert({
        id: randomUUID(),
        teamId: team.id,
        userId: user.id,
        createdAt: new Date(),
      });
    }

    // The org-scoped application role. Better Auth's membership role says what
    // the caller is on the roster; this is what the app's routes actually
    // check, and the two are only ever written together.
    const role = await roleRepo.findOneBy({ name: membership.applicationRole });
    if (!role) continue;
    const assigned = await userRoleRepo.findOneBy({
      userId: user.id,
      roleId: role.id,
      organizationId: organization.id,
    });
    if (!assigned) {
      await userRoleRepo.insert({
        userId: user.id,
        roleId: role.id,
        organizationId: organization.id,
      });
    }
  }
}
