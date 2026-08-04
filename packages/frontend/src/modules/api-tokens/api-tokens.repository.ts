import { ApiTokensApi } from '@flama/api-client';
import type { CreateApiTokenDto, PermissionGroup, Scope } from '@flama/shared';
import { injectable } from 'inversify';
import { AppError, withAppError } from '../core/errors';
import { ApiTokenEntity, type CreatedApiToken, type CurrentCredential } from './api-token.entity';
import { ApiTokensErrors } from './api-tokens.errors';

interface ApiTokenResponse {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  organizationIds: string[] | null;
  ipAllowlist: string[] | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

function toEntity(data: ApiTokenResponse): ApiTokenEntity {
  return new ApiTokenEntity(
    data.id,
    data.name,
    data.prefix,
    data.scopes as Scope[],
    data.organizationIds,
    data.ipAllowlist,
    toDate(data.expiresAt),
    toDate(data.lastUsedAt),
    toDate(data.revokedAt),
    new Date(data.createdAt),
  );
}

function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

@injectable()
export class ApiTokensRepository {
  async findAll(): Promise<ApiTokenEntity[]> {
    const result = await withAppError(ApiTokensErrors.FETCH_LIST_FAILED, () =>
      ApiTokensApi.findAll(),
    );
    if (!result) throw new AppError(ApiTokensErrors.FETCH_LIST_FAILED);
    return result.map((token) => toEntity(token as unknown as ApiTokenResponse));
  }

  async create(dto: CreateApiTokenDto): Promise<CreatedApiToken> {
    const result = await withAppError(ApiTokensErrors.CREATE_FAILED, () =>
      ApiTokensApi.create(dto as never),
    );
    if (!result) throw new AppError(ApiTokensErrors.CREATE_FAILED);

    const created = result as unknown as ApiTokenResponse & { token: string };
    return { token: toEntity(created), secret: created.token };
  }

  async revoke(id: string): Promise<void> {
    await withAppError(ApiTokensErrors.REVOKE_FAILED, () => ApiTokensApi.revoke(id));
  }

  /**
   * The permission catalog plus the subset the caller may grant. Only the
   * server can answer the second part — it depends on the caller's roles.
   */
  async permissions(): Promise<{
    groups: PermissionGroup[];
    grantable: Scope[];
  }> {
    const result = await withAppError(ApiTokensErrors.FETCH_PERMISSIONS_FAILED, () =>
      ApiTokensApi.permissions(),
    );
    if (!result) throw new AppError(ApiTokensErrors.FETCH_PERMISSIONS_FAILED);

    return {
      groups: result.groups as unknown as PermissionGroup[],
      grantable: result.grantable as Scope[],
    };
  }

  async currentCredential(): Promise<CurrentCredential> {
    const result = await withAppError(ApiTokensErrors.FETCH_CREDENTIAL_FAILED, () =>
      ApiTokensApi.current(),
    );
    if (!result) throw new AppError(ApiTokensErrors.FETCH_CREDENTIAL_FAILED);

    return {
      kind: result.kind as CurrentCredential['kind'],
      userId: result.userId,
      email: result.email,
      grantedScopes: (result.grantedScopes ?? null) as Scope[] | null,
      effectiveScopes: result.effectiveScopes as Scope[],
      organizationIds: result.organizationIds ?? null,
      expiresAt: toDate(result.expiresAt as unknown as string | null),
    };
  }
}
