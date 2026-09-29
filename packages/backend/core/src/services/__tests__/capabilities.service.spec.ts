import { describe, expect, it } from 'vitest';
import { CapabilitiesService } from '../capabilities.service';

describe('CapabilitiesService', () => {
  const service = new CapabilitiesService({
    google_oauth: true,
    github_oauth: false,
    extra: false,
  });

  it('answers has() per capability', () => {
    expect(service.has('google_oauth')).toBe(true);
    expect(service.has('github_oauth')).toBe(false);
  });

  it('splits enabled and disabled capabilities', () => {
    expect(service.enabled()).toEqual(['google_oauth']);
    expect(service.disabled()).toEqual(['github_oauth', 'extra']);
  });

  it('describes the whole set on one line for the startup log', () => {
    expect(service.describe()).toBe('google_oauth=on, github_oauth=off, extra=off');
  });

  it('pick() narrows the snapshot to the given capabilities only', () => {
    expect(service.pick(['google_oauth', 'extra'])).toEqual({
      google_oauth: true,
      extra: false,
    });
  });

  it('snapshot() returns a copy, not the internal map', () => {
    const snapshot = service.snapshot();
    snapshot.google_oauth = false;
    expect(service.has('google_oauth')).toBe(true);
  });

  it('is immutable after construction, even via the constructor argument', () => {
    const input = { extra: false };
    const fromInput = new CapabilitiesService(input);
    input.extra = true;
    expect(fromInput.has('extra')).toBe(false);
  });
});
