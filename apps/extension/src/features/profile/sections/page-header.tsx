import { BrandMark } from '@flama/design-system-web';
import type { ReactNode } from 'react';
import { AccountMenu } from './account-menu';

/**
 * The header of the popup and the side panel: the mark, what this page is,
 * and the account. `signedIn` decides whether there is an account to show —
 * the header stays put while the gate below swaps sign-in for content.
 */
export function PageHeader({ title, signedIn }: { title: ReactNode; signedIn: boolean }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <BrandMark size={20} />
        <h1 className="truncate text-base font-medium text-ink-900">{title}</h1>
      </div>
      {signedIn && <AccountMenu />}
    </header>
  );
}
