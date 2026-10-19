import { Alert, AlertDescription, AlertTitle, Button } from '@flama/design-system-web';
import { useTranslation } from 'react-i18next';

/** The session could not be looked up — the API is down or unreachable. Offers a retry. */
export function SessionError({
  onRetry,
  isRetrying,
}: {
  onRetry: () => void;
  isRetrying: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Alert variant="destructive">
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
