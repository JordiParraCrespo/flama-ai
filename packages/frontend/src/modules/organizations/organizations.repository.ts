import { OrganizationsApi } from '@flama/api-client';
import { injectable } from 'inversify';
import { OrganizationEntity } from './organization.entity';

@injectable()
export class OrganizationsRepository {
  async findAll(): Promise<OrganizationEntity[]> {
    const result = await OrganizationsApi.list();
    if (!result) return [];

    return result.map(
      (organization) =>
        new OrganizationEntity(
          organization.id,
          organization.name,
          organization.slug,
          new Date(organization.createdAt),
        ),
    );
  }
}
