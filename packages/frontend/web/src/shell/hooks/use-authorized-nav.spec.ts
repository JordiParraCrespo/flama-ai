import { LayoutDashboard, Settings } from '@flama/design-system-web/icons';
import { useMyPermissions } from '@flama/frontend-core/react';
import type { PermissionDefinition } from '@flama/shared/permissions';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavItem } from '../lib/nav';
import { useAuthorizedNav, useLandingRoute } from './use-authorized-nav';

/** The consumer app's nav: both rows are ungated, so every reader is offered both. */
const NAV: readonly NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard', policies: [] },
  { to: '/settings', icon: Settings, labelKey: 'settings', policies: [] },
];

/**
 * The sidebar's promise, asserted at the two ends that used to disagree with
 * each other: what a role is offered, and where the product sends someone who
 * did not choose the screen themselves.
 *
 * The failure branches matter as much as the happy one. A permissions request
 * that never answers must not empty the product, and a reader with nothing to
 * open must not be routed in a circle.
 */

vi.mock('@flama/frontend-core/react', () => ({ useMyPermissions: vi.fn() }));

function signedInWith(permissions: PermissionDefinition[]) {
  vi.mocked(useMyPermissions).mockReturnValue({
    data: permissions,
    isError: false,
  } as unknown as ReturnType<typeof useMyPermissions>);
}

function stillLoading() {
  vi.mocked(useMyPermissions).mockReturnValue({
    data: undefined,
    isError: false,
  } as unknown as ReturnType<typeof useMyPermissions>);
}

function couldNotBeFetched() {
  vi.mocked(useMyPermissions).mockReturnValue({
    data: undefined,
    isError: true,
  } as unknown as ReturnType<typeof useMyPermissions>);
}

const routesOffered = () => renderHook(() => useAuthorizedNav(NAV)).result.current.map((e) => e.to);
const landing = () => renderHook(() => useLandingRoute(NAV)).result.current;

beforeEach(() => {
  vi.mocked(useMyPermissions).mockReset();
});

describe('useAuthorizedNav', () => {
  it('offers an owner everything', () => {
    signedInWith([{ action: 'manage', subject: 'all' }]);

    expect(routesOffered()).toEqual(['/dashboard', '/settings']);
  });

  it('offers a member holding nothing only the ungated rows', () => {
    signedInWith([]);

    expect(routesOffered()).toEqual(['/dashboard', '/settings']);
  });

  it('keeps control-plane permissions out of consumer navigation', () => {
    signedInWith([{ action: 'read', subject: 'Member' }]);

    expect(routesOffered()).toEqual(['/dashboard', '/settings']);
  });

  it('shows only the ungated rows while the permission set is loading', () => {
    stillLoading();

    expect(routesOffered()).toEqual(['/dashboard', '/settings']);
  });

  it('keeps the consumer shell usable when permissions could not be fetched', () => {
    couldNotBeFetched();

    expect(routesOffered()).toEqual(['/dashboard', '/settings']);
  });
});

describe('useLandingRoute', () => {
  it('is the dashboard for a role that can read it', () => {
    signedInWith([{ action: 'manage', subject: 'all' }]);

    expect(landing()).toBe('/dashboard');
  });

  it('is the dashboard even for a reader holding nothing — it reads only their own profile', () => {
    signedInWith([]);

    expect(landing()).toBe('/dashboard');
  });

  it('remains the dashboard while permissions are loading or unavailable', () => {
    stillLoading();
    expect(landing()).toBe('/dashboard');

    couldNotBeFetched();
    expect(landing()).toBe('/dashboard');
  });
});
