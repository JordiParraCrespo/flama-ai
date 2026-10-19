import { useTranslation } from 'react-i18next';

/** While the session is being looked up. Hand-rolled, as in apps/web: the design system ships no spinner. */
export function SessionPending() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-48 flex-1 items-center justify-center">
      <div
        role="status"
        aria-label={t('common.loading')}
        className="size-6 animate-spin rounded-full border-2 border-border-subtle border-t-surface-inverse"
      />
    </div>
  );
}
