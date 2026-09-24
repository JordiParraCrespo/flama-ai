import { cn } from '@flama/design-system-web';
import type { LucideIcon } from '@flama/design-system-web/icons';
import type { ReactNode } from 'react';

export interface SectionNavItem<TKey extends string> {
  key: TKey;
  icon: LucideIcon;
  /** Already translated. */
  label: string;
}

/**
 * A page split into panes: a sticky list of sections on the left, the open
 * pane on the right, stacked below 940px.
 *
 * Which pane is open is the caller's — both screens that use it keep it in the
 * URL, so a pane can be linked to and the back button steps between panes.
 */
export function SectionNav<TKey extends string>({
  label,
  items,
  active,
  onSelect,
  className,
  children,
}: {
  /** The nav's accessible name. */
  label: string;
  items: readonly SectionNavItem<TKey>[];
  active: TKey;
  onSelect: (key: TKey) => void;
  className?: string;
  /** The open pane. */
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid items-start gap-5.5 min-[940px]:grid-cols-[216px_1fr] min-[940px]:gap-9',
        className,
      )}
    >
      <nav aria-label={label} className="sticky top-0 flex flex-col gap-0.5">
        {items.map(({ key, icon: Icon, label: itemLabel }) => {
          const current = key === active;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-current={current ? 'page' : undefined}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2.5 rounded-md border-none px-2.75 py-2.25 text-left font-sans text-base transition-colors',
                current
                  ? 'bg-surface-sunken font-medium text-ink-900'
                  : 'bg-transparent text-ink-600 hover:bg-surface-hover hover:text-ink-900',
              )}
            >
              <Icon className={cn('size-3.75', current ? 'text-ink-900' : 'text-ink-400')} />
              {itemLabel}
            </button>
          );
        })}
      </nav>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
