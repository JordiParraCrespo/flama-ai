import { None, Some } from 'oxide.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeatureFlagRepositoryPort } from '../../../database/feature-flag.repository.port';
import { FeatureFlagEntity } from '../../../domain/feature-flag.entity';
import { ToggleFeatureFlagCommand } from '../toggle-feature-flag.command';
import { ToggleFeatureFlagCommandHandler } from '../toggle-feature-flag.command-handler';

// The starter declares no flags; the machinery is tested on a catalog of its own.
vi.mock('@flama/shared', async (importOriginal) => {
  const { withTestFlags } = await import('@flama/shared/feature-flags/testing');
  return withTestFlags(await importOriginal<typeof import('@flama/shared')>());
});

describe('ToggleFeatureFlagCommandHandler', () => {
  let flags: Pick<FeatureFlagRepositoryPort, 'findOneByKey' | 'save'>;
  let handler: ToggleFeatureFlagCommandHandler;

  beforeEach(() => {
    flags = {
      findOneByKey: vi.fn().mockResolvedValue(None),
      save: vi.fn().mockImplementation(async (flag) => flag),
    };
    handler = new ToggleFeatureFlagCommandHandler(flags as FeatureFlagRepositoryPort);
  });

  it('pulls a kill switch nobody has configured yet', async () => {
    await handler.execute(
      new ToggleFeatureFlagCommand({
        key: 'kill_switch',
        enabled: false,
        actorId: 'admin-1',
      }),
    );

    const saved = vi.mocked(flags.save).mock.calls[0]?.[0] as FeatureFlagEntity;
    expect(saved.enabled).toBe(false);
    expect(saved.domainEvents).toHaveLength(1);
  });

  it('writes nothing when the switch is already where it was asked to go', async () => {
    const flag = FeatureFlagEntity.createFor('kill_switch', true);
    flag.setEnabled(false, { actorId: null });
    flag.clearEvents();
    vi.mocked(flags.findOneByKey).mockResolvedValue(Some(flag));

    await handler.execute(
      new ToggleFeatureFlagCommand({
        key: 'kill_switch',
        enabled: false,
        actorId: 'admin-1',
      }),
    );

    expect(flags.save).not.toHaveBeenCalled();
  });
});
