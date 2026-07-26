import { inject, injectable } from 'inversify';
import { TOKENS } from '../../di/tokens';
import type { OrganizationEntity } from './organization.entity';
import type { OrganizationsRepository } from './organizations.repository';

@injectable()
export class OrganizationsService {
  constructor(
    @inject(TOKENS.OrganizationsRepository)
    private readonly repository: OrganizationsRepository,
  ) {}

  findAll(): Promise<OrganizationEntity[]> {
    return this.repository.findAll();
  }
}
