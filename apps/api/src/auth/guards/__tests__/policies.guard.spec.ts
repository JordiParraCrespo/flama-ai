import { NO_POLICY_KEY } from '@flama/backend-authz';
import { AppError } from '@flama/backend-core';
import { defineAbilitiesFromPermissions } from '@flama/shared';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AbilityFactory } from '../../../roles/services/ability.factory';
import { CHECK_POLICIES_KEY } from '../../decorators/check-policies.decorator';
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
  let abilityFactory: AbilityFactory;

  beforeEach(() => {
    abilityFactory = {
      forRequest: vi
        .fn()
        .mockResolvedValue(defineAbilitiesFromPermissions([{ action: 'read', subject: 'Lead' }])),
    } as unknown as AbilityFactory;
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

    await expect(guard.canActivate(contextWith({ user: { id: 'u1' } }))).resolves.toBe(false);
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

  it('refuses to evaluate a policy without an authenticated caller', async () => {
    const guard = new PoliciesGuard(
      reflectorFor({
        [CHECK_POLICIES_KEY]: [{ action: 'read', subject: 'Lead' }],
      }),
      abilityFactory,
    );

    await expect(guard.canActivate(contextWith({}))).rejects.toThrow(ForbiddenException);
  });

  it('builds the ability once per request', async () => {
    const guard = new PoliciesGuard(
      reflectorFor({
        [CHECK_POLICIES_KEY]: [{ action: 'read', subject: 'Lead' }],
      }),
      abilityFactory,
    );
    const request = { user: { id: 'u1' } };

    await guard.canActivate(contextWith(request));

    expect(abilityFactory.forRequest).toHaveBeenCalledTimes(1);
  });
});
