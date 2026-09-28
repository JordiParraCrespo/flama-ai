import { NO_POLICY_KEY } from '@flama/backend-authz';
import { AppError } from '@flama/backend-core';
import { defineAbilitiesFromPermissions } from '@flama/shared';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ABILITY_MEMO, type AbilityPort } from '../../application/ability.port';
import { CHECK_POLICIES_KEY } from '../../decorators/check-policies.decorator';
import { ORGANIZATION_PARAM_KEY } from '../../decorators/organization-scoped.decorator';
import { AuthErrors } from '../../domain/auth.errors';
import { PoliciesGuard } from '../policies.guard';

/** Metadata the route under test declares, keyed the way the reflector reads it. */
type Metadata = Record<string, unknown>;

function contextWith(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function reflectorFor(metadata: Metadata): Reflector {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockImplementation(
    (key: unknown) => metadata[key as string],
    // biome-ignore lint/suspicious/noExplicitAny: the reflector's generic signature is not worth reproducing here
  ) as any;
  return reflector;
}

describe('PoliciesGuard', () => {
  let abilityFactory: AbilityPort;

  beforeEach(() => {
    abilityFactory = {
      forRequest: vi
        .fn()
        .mockResolvedValue(defineAbilitiesFromPermissions([{ action: 'read', subject: 'Lead' }])),
    } as unknown as AbilityPort;
  });

  it('allows a route whose policy the caller satisfies', async () => {
    const guard = new PoliciesGuard(
      reflectorFor({
        [CHECK_POLICIES_KEY]: [{ action: 'read', subject: 'Lead' }],
      }),
      abilityFactory,
    );

    await expect(guard.canActivate(contextWith({ user: { id: 'u1' } }))).resolves.toBe(true);
  });

  it('denies a route whose policy the caller does not satisfy', async () => {
    const guard = new PoliciesGuard(
      reflectorFor({
        [CHECK_POLICIES_KEY]: [{ action: 'delete', subject: 'Lead' }],
      }),
      abilityFactory,
    );

    // Returning `false` would hand back Nest's own codeless 403; the guard
    // throws the catalog error so the response carries AUTH_002.
    const error = await guard
      .canActivate(contextWith({ user: { id: 'u1' } }))
      .catch((thrown: AppError) => thrown);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(AuthErrors.FORBIDDEN.code);
  });

  it('rejects a route that declares no policy at all', async () => {
    // The regression this guard exists to prevent: before, an undeclared route
    // was reachable by any authenticated caller.
    const guard = new PoliciesGuard(reflectorFor({}), abilityFactory);

    await expect(guard.canActivate(contextWith({ user: { id: 'u1' } }))).rejects.toThrow(AppError);
  });

  it('allows a route with an explicit reasoned exemption', async () => {
    const guard = new PoliciesGuard(
      reflectorFor({ [NO_POLICY_KEY]: 'returns the caller’s own profile' }),
      abilityFactory,
    );

    await expect(guard.canActivate(contextWith({ user: { id: 'u1' } }))).resolves.toBe(true);
  });

  it('reports a missing principal as unauthenticated, not forbidden', async () => {
    const guard = new PoliciesGuard(
      reflectorFor({
        [CHECK_POLICIES_KEY]: [{ action: 'read', subject: 'Lead' }],
      }),
      abilityFactory,
    );

    // 401 tells the client to re-authenticate; a 403 would have it give up on
    // a request a fresh session would satisfy.
    const error = await guard.canActivate(contextWith({})).catch((thrown: AppError) => thrown);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(AuthErrors.UNAUTHENTICATED.code);
  });

  it('builds the ability once per request and attaches it for handlers', async () => {
    const guard = new PoliciesGuard(
      reflectorFor({
        [CHECK_POLICIES_KEY]: [{ action: 'read', subject: 'Lead' }],
      }),
      abilityFactory,
    );
    const request: Record<string, unknown> = { user: { id: 'u1' } };

    await guard.canActivate(contextWith(request));

    expect(abilityFactory.forRequest).toHaveBeenCalledTimes(1);
    expect(request.ability).toBe(await vi.mocked(abilityFactory.forRequest).mock.results[0].value);
  });

  it('hands the port { user, session } and the request memo, not the request', async () => {
    const guard = new PoliciesGuard(
      reflectorFor({ [CHECK_POLICIES_KEY]: [{ action: 'read', subject: 'Lead' }] }),
      abilityFactory,
    );
    const request = {
      user: { id: 'u1' },
      session: { activeOrganizationId: 'org-a' },
      headers: { authorization: 'Bearer secret' },
    };

    await guard.canActivate(contextWith(request));

    const [subject] = vi.mocked(abilityFactory.forRequest).mock.calls[0];
    expect(subject).not.toBe(request);
    expect(Object.keys(subject)).toEqual(['user', 'session']);
    expect(subject.user).toBe(request.user);
    // The memo lives on the request so every caller in it shares one.
    expect(subject[ABILITY_MEMO]).toBe((request as Record<symbol, unknown>)[ABILITY_MEMO]);
    expect(subject[ABILITY_MEMO]).toBeInstanceOf(Map);
  });

  it("judges an organization-scoped route by the caller's roles in the path's organization", async () => {
    const guard = new PoliciesGuard(
      reflectorFor({
        [CHECK_POLICIES_KEY]: [{ action: 'read', subject: 'Lead' }],
        [ORGANIZATION_PARAM_KEY]: 'orgId',
      }),
      abilityFactory,
    );
    const request = {
      user: { id: 'u1' },
      params: { orgId: 'org-b' },
      session: { activeOrganizationId: 'org-a' },
    };

    await guard.canActivate(contextWith(request));

    expect(abilityFactory.forRequest).toHaveBeenCalledWith(
      expect.objectContaining({ user: request.user, session: request.session }),
      'org-b',
    );
  });

  it("falls back to the session's active organization on a route that names none", async () => {
    const guard = new PoliciesGuard(
      reflectorFor({ [CHECK_POLICIES_KEY]: [{ action: 'read', subject: 'Lead' }] }),
      abilityFactory,
    );
    const request = { user: { id: 'u1' }, session: { activeOrganizationId: 'org-a' } };

    await guard.canActivate(contextWith(request));

    expect(abilityFactory.forRequest).toHaveBeenCalledWith(
      expect.objectContaining({ user: request.user, session: request.session }),
      null,
    );
  });
});
