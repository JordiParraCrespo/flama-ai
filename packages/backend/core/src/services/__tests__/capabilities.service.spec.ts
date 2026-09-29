import { describe, expect, it } from 'vitest';
import { CapabilitiesService } from '../capabilities.service';

describe('CapabilitiesService', () => {
  const service = new CapabilitiesService({
    google_oauth: true,
    github_oauth: false,
    email_delivery: false,
  });

  it('answers has() per capability', () => {
    expect(service.has('google_oauth')).toBe(true);
    expect(service.has('github_oauth')).toBe(false);
  });

  it('splits enabled and disabled capabilities', () => {
    expect(service.enabled()).toEqual(['google_oauth']);
    expect(service.disabled()).toEqual(['github_oauth', 'email_delivery']);
  });

  it('describes the whole set on one line for the startup log', () => {
    expect(service.describe()).toBe('google_oauth=on, github_oauth=off, email_delivery=off');
  });

  it('pick() narrows the snapshot to the given capabilities only', () => {
    expect(service.pick(['google_oauth', 'email_delivery'])).toEqual({
      google_oauth: true,
      email_delivery: false,
    });
  });

  it('snapshot() returns a copy, not the internal map', () => {
    const snapshot = service.snapshot();
    snapshot.google_oauth = false;
    expect(service.has('google_oauth')).toBe(true);
  });

  it('is immutable after construction, even via the constructor argument', () => {
    const input = { email_delivery: false };
    const fromInput = new CapabilitiesService(input);
    input.email_delivery = true;
    expect(fromInput.has('email_delivery')).toBe(false);
  });
});
