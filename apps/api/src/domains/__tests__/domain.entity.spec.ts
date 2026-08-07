import { describe, expect, it } from 'vitest';
import { DomainEntity } from '../domain/domain.entity';
import { Hostname } from '../domain/value-objects/hostname.value-object';

function connect(overrides: Partial<Parameters<typeof DomainEntity.connect>[0]> = {}) {
  return DomainEntity.connect({
    organizationId: 'org-1',
    hostname: Hostname.of('example.com'),
    protocol: 'https',
    importSearchConsole: true,
    runInitialCrawl: true,
    ...overrides,
  });
}

describe('Hostname', () => {
  it('normalizes case and a trailing dot', () => {
    expect(Hostname.of('  Blog.Example.COM. ').value).toBe('blog.example.com');
  });

  it.each(['example', 'https://example.com', 'example .com', 'exa_mple.com', '-bad.com'])(
    'rejects %s',
    (value) => {
      expect(() => Hostname.of(value)).toThrow();
    },
  );

  it('accepts a multi-level subdomain', () => {
    expect(Hostname.of('a.b.example.co.uk').value).toBe('a.b.example.co.uk');
  });
});

describe('DomainEntity.connect', () => {
  it('starts in draft, unverified and unassigned by default', () => {
    const domain = connect();

    expect(domain.status).toBe('draft');
    expect(domain.isVerified).toBe(false);
    expect(domain.ownerId).toBeNull();
    expect(domain.id).toEqual(expect.any(String));
  });

  it('raises DomainConnectedDomainEvent carrying the requested on-connect work', () => {
    const domain = connect({
      importSearchConsole: true,
      runInitialCrawl: false,
    });

    const [event] = domain.domainEvents;
    expect(event.constructor.name).toBe('DomainConnectedDomainEvent');
    expect(event).toMatchObject({
      organizationId: 'org-1',
      hostname: 'example.com',
      importSearchConsole: true,
      runInitialCrawl: false,
    });
  });

  it('exposes the canonical url from protocol + hostname', () => {
    expect(connect({ protocol: 'http' }).url).toBe('http://example.com');
  });
});

describe('DomainEntity.update', () => {
  it('activates and raises a status-changed event', () => {
    const domain = connect();
    domain.clearEvents();

    domain.update({ status: 'active' });

    expect(domain.status).toBe('active');
    const [event] = domain.domainEvents;
    expect(event).toMatchObject({ previousStatus: 'draft', status: 'active' });
  });

  it('activates without requiring verification, so `active` is reachable', () => {
    const domain = connect();

    expect(domain.isVerified).toBe(false);
    expect(() => domain.update({ status: 'active' })).not.toThrow();
    expect(domain.status).toBe('active');
  });

  it('allows pausing an active domain', () => {
    const domain = connect();
    domain.update({ status: 'active' });
    domain.clearEvents();

    domain.update({ status: 'paused' });

    expect(domain.status).toBe('paused');
    expect(domain.domainEvents).toHaveLength(1);
  });

  it('raises no event when the status is unchanged', () => {
    const domain = connect();
    domain.clearEvents();

    domain.update({ status: 'draft' });

    expect(domain.domainEvents).toHaveLength(0);
  });

  it('distinguishes an absent ownerId from an explicit null', () => {
    const domain = connect({ ownerId: 'user-1' });

    domain.update({ protocol: 'http' });
    expect(domain.ownerId).toBe('user-1');

    domain.update({ ownerId: null });
    expect(domain.ownerId).toBeNull();
  });
});
