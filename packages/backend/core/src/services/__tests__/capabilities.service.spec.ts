import { describe, expect, it } from 'vitest';
import { CapabilitiesService } from '../capabilities.service';

describe('CapabilitiesService', () => {
  const service = new CapabilitiesService({
    alpha: true,
    beta: false,
    email_delivery: false,
  });

  it('answers has() per capability', () => {
    expect(service.has('alpha')).toBe(true);
    expect(service.has('beta')).toBe(false);
  });

  it('splits enabled and disabled capabilities', () => {
    expect(service.enabled()).toEqual(['alpha']);
    expect(service.disabled()).toEqual(['beta', 'email_delivery']);
  });

  it('describes the whole set on one line for the startup log', () => {
    expect(service.describe()).toBe('alpha=on, beta=off, email_delivery=off');
  });

  it('pick() narrows the snapshot to the given capabilities only', () => {
    expect(service.pick(['alpha', 'email_delivery'])).toEqual({
      alpha: true,
      email_delivery: false,
    });
  });

  it('snapshot() returns a copy, not the internal map', () => {
    const snapshot = service.snapshot();
    snapshot.alpha = false;
    expect(service.has('alpha')).toBe(true);
  });

  it('is immutable after construction, even via the constructor argument', () => {
    const input = { email_delivery: false };
    const fromInput = new CapabilitiesService(input);
    input.email_delivery = true;
    expect(fromInput.has('email_delivery')).toBe(false);
  });
});
