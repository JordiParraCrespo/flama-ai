import { OrganizationsApi } from '@flama/api-client';
import { injectable } from 'inversify';
import { AppError } from '../core/errors';
import { MapApiError } from '../core/map-api-error.decorator';
import { OrganizationEntity } from './organization.entity';
import { OrganizationsErrors } from './organizations.errors';

@injectable()
export class OrganizationsRepository {
  @MapApiError(OrganizationsErrors.FETCH_LIST_FAILED)
  async findAll(): Promise<OrganizationEntity[]> {
    const result = await OrganizationsApi.list();
    // An absent body is a failed read, not an empty collection — returning `[]`
    // here would render "no organizations" over a request that never succeeded.
    if (!result) throw new AppError(OrganizationsErrors.FETCH_LIST_FAILED);

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
