import { describe, expect, it } from 'vitest';
import { jobId } from './job-id';

/**
 * BullMQ rejects these ids only when a real queue adds the job, so a producer
 * tested against a mocked queue never sees it. A `host-paired:<id>` job id
 * once threw on every call and the email it carried never went out.
 */
describe('jobId', () => {
  it('joins its parts with a dash', () => {
    expect(jobId('invitation', 'b9d6c1a2-0000-4000-8000-000000000000')).toBe(
      'invitation-b9d6c1a2-0000-4000-8000-000000000000',
    );
  });

  it('refuses a colon, which BullMQ reserves for its Redis keys', () => {
    expect(() => jobId('host-paired:42')).toThrow(/cannot contain ':'/);
    // Two colons get past BullMQ's own check (legacy repeatable ids); not here.
    expect(() => jobId('a:b:c')).toThrow(/cannot contain ':'/);
  });

  it('refuses an integer, which BullMQ keeps for the ids it assigns', () => {
    expect(() => jobId(42)).toThrow(/cannot be integers/);
    expect(() => jobId('7')).toThrow(/cannot be integers/);
  });

  it('refuses no parts at all', () => {
    expect(() => jobId()).toThrow(/at least one part/);
  });
});
