import { Alert, AlertDescription, AlertTitle, Button } from '@flama/design-system-web';
import { useTranslation } from 'react-i18next';

/** Restoring the session failed before the app could draw; offers a retry. */
export function SessionRestoreError({
  onRetry,
  isRetrying,
}: {
  onRetry: () => void;
  isRetrying: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Alert variant="destructive" className="max-w-sm">
        <AlertTitle>{t('auth.session.errorTitle')}</AlertTitle>
        <AlertDescription>{t('auth.session.errorMessage')}</AlertDescription>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-3.5 w-fit"
        >
          {isRetrying ? t('auth.session.retrying') : t('auth.session.retry')}
        </Button>
      </Alert>
    </div>
  );
}
