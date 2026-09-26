import { Button } from '@flama/design-system-mobile/button';
import { Text } from '@flama/design-system-mobile/text';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

export interface ScreenErrorFallbackProps {
  onReset: () => void;
  /** Defaults to the generic "Something went wrong". */
  title?: string;
  /** A line under the title saying what failed, when the caller knows. */
  message?: string;
  /** A retry already in flight: the button waits instead of queueing another. */
  isRetrying?: boolean;
}

/**
 * A failed screen with one way out. The error boundary passes only `onReset`;
 * a caller that knows what failed (the session restore) names it and says
 * when its retry is running, rather than drawing a second copy of this.
 */
export function ScreenErrorFallback({
  onReset,
  title,
  message,
  isRetrying = false,
}: ScreenErrorFallbackProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-8" role="alert">
      <Text className="text-center text-xl font-medium text-ink-900">
        {title ?? t('common.error')}
      </Text>
      {message ? <Text className="text-center text-sm text-ink-600">{message}</Text> : null}
      <Button onPress={onReset} disabled={isRetrying} className="mt-3">
        <Text>{isRetrying ? t('auth.session.retrying') : t('auth.session.retry')}</Text>
      </Button>
    </View>
  );
}
